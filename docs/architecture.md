# Arquitectura — BetPulse

## Principios

- **Monolito modular** en Java: consistencia transaccional y despliegue simple para un solo desarrollador.
- **Ingestión event-driven**: GSI/OpenDota → eventos → estado → cuotas.
- **Ledger como fuente de verdad**: doble entrada, append-only.
- **Cuotas solo en el servidor**: el cliente nunca calcula ni impone cuotas.
- **Fuente híbrida con calidad de dato**: cada mercado conoce su fuente, delay y confianza.
- **Local-first**: la demo no depende de la nube ni de una LAN.
- **Seguridad por diseño**: RBAC, auditoría, idempotencia y límites.

## Diagrama de contexto

```text
Usuario / Admin
      │ HTTPS
      ▼
BetPulse Web (Next.js) ──iframe──► Twitch / YouTube
      │ HTTPS + SSE
      ▼
Spring Boot API ─────► OpenDota API
      │
      ├────► PostgreSQL
      │
      └────► Redis (opcional)

Dota 2 (modo espectador)
      │ GSI HTTP POST
      ▼
Colector GSI (Java) ──localhost──► Spring Boot /internal/ingest
```

En desarrollo, Next.js hace proxy de `/api` al backend para evitar CORS y compartir cookies. No se usa Caddy en la primera etapa.

## Contenedores

| Contenedor | Tecnología | Responsabilidad |
|---|---|---|
| Frontend | Next.js + React + TypeScript | UI pública, admin, i18n, SSE, bet slip |
| Backend | Spring Boot 3 + Java 21 | API REST, SSE, dominio, cuotas, liquidación |
| Colector GSI | Java 21 + Javalin | Recibir GSI, validar, batchear, reenviar |
| Base de datos | PostgreSQL | Ledger, apuestas, mercados, eventos, auditoría |
| Caché | Redis (opcional) | Pub/sub, rate limiting, locks |
| Fuente externa | OpenDota | Catálogo, partidos secundarios, verificación |
| Streaming | Twitch/YouTube | iframe oficial del partido |

## Módulos del backend

| Módulo | Responsabilidad |
|---|---|
| `identity` | Registro, login, sesiones, roles |
| `catalog` | Catálogo OpenDota, poller, caché y contrato del lobby |
| `live` | SSE de lobby, salud del feed; ingesta GSI pendiente (M2b) |
| `markets` | Mercados, selecciones, versiones, suspensiones |
| `odds` | Modelos, probabilidad, margen, historial |
| `betting` | Bet slip, validación, holds, límites |
| `wallet` | Ledger, saldos, depósitos/retiros simulados |
| `settlement` | Liquidación, verificación, void, payouts |
| `payments` | Abstracción de proveedor simulado |
| `admin` | Control de mercados, cuotas, usuarios, exposición |
| `audit` | Bitácora inmutable de acciones |
| `shared` | Errores, dinero, eventos, utilidades |

## Frontend actual

- `app/page.tsx` es un server component dinámico; obtiene el lobby con `getLobbyData()`.
- `lib/catalog.ts` consulta el backend en `BACKEND_URL` (por defecto `http://127.0.0.1:8081`) vía `GET /api/catalog/lobby`, con timeout de 7 s y `cache: "no-store"`. Si el backend no responde, devuelve lobby vacío con `feed.status=DOWN`.
- `lib/live.ts` abre `EventSource("/api/live/stream")`, escucha `lobby` y `heartbeat`, y expone `data` + `connected` a `HomeLobby`.
- `components/home-lobby.tsx` usa el snapshot inicial del servidor y lo reemplaza con cada evento SSE; muestra badge de feed (`feed.live`, `degraded`, `stale`, `reconnecting`, `down`, `starting`) en ES/EN, y orquesta filtros, lista, bet slip, modales y navegación.
- Componentes: `site-header`, `live-ticker`, `filter-rail`, `match-card`, `bet-slip`, `login-modal`, `match-detail-modal`, `site-footer`, `game-switcher`, `modal`.
- Tokens en `app/globals.css`: navy `#0B1220`, naranja `#F97316`, fondo `#F4F6F8`; tipografía local.
- Auth y wallet ya implementados: modal de login/registro contra la API, sesión con cookie HttpOnly + CSRF, header autenticado y página `/wallet` con depósitos/retiros demo e historial.
- Sin cuotas ni apuestas reales todavía: las cards indican “Mercados no publicados” y el bet slip sigue siendo UI.

## Flujo de datos

1. Dota 2 en modo espectador envía GSI al colector local (M2b, pendiente de fixtures).
2. El colector valida token, normaliza, batchea y envía al backend con HMAC.
3. El backend guarda snapshot/eventos, actualiza el estado del partido y detecta eventos relevantes.
4. El poller OpenDota refresca el catálogo cada 30 s; `CatalogService` publica un evento interno y `LiveFeedService` lo difunde por SSE (`lobby`).
5. El motor de cuotas recalculará mercados afectados, aplicará margen, versionará y publicará por SSE (M3).
6. OpenDota se consulta periódicamente para catálogo, partidos secundarios, pre-partida y verificación.
7. El usuario apuesta: el backend valida mercado, versión, cuota, límites y saldo; retiene fondos y registra la apuesta (M4).
8. Al terminar el partido, el settlement liquida de forma idempotente, paga al ganador y audita (M5).
9. Depósitos/retiros simulados pasan por la abstracción de pagos y el ledger.

## Fuente híbrida

| Fuente | Uso | Frecuencia | Calidad |
|---|---|---|---|
| GSI | Partido espectado | ~10/s | Alta, evento por evento |
| OpenDota `/live` | Partidos secundarios | 30–60 s | Media, con delay |
| OpenDota histórico | Ratings, calibración, verificación | Bajo demanda | Alta para histórico |
| GSI League | Series, streams, torneo | Con el feed | Alta |

Reglas:

- El partido GSI es el principal de la demo.
- Los partidos OpenDota se muestran con etiqueta de delay y mercados más conservadores.
- Si el feed se atrasa, se suspenden mercados.
- La liquidación del partido GSI se verifica con OpenDota cuando exista `match_id`.
- OpenDota `/live` puede informar `is_watch_eligible` y `delay`; usarlos para decidir qué partido espectar.

> Implementación M2a: el backend es la única fuente del catálogo. El poller (`CatalogScheduler` + `CatalogService`) mantiene un snapshot en memoria; `GET /api/catalog/lobby` lo expone y `GET /api/live/stream` lo difunde por SSE. El frontend ya no llama OpenDota. La caché se pierde al reiniciar el backend y se reconstruye con el primer poll. No se usan cuotas ni datos simulados.

## Modelo de datos (alto nivel)

- `users`, `roles`
- `wallets`, `ledger_accounts`, `ledger_transactions`, `ledger_entries`
- `idempotency_keys`
- `matches`, `tournaments`, `teams`, `players`, `match_participants`
- `game_snapshots`, `game_events`, `match_state`
- `markets`, `selections`, `odds_history`, `market_suspensions`
- `bets`, `bet_selections`, `bet_status_history`
- `settlements`, `payouts`
- `deposits`, `withdrawals`, `payment_intents`
- `idempotency_keys`, `audit_logs`, `outbox_events`

> Sesión de M1: `HttpSession` en memoria con cookie `BETPULSE_SESSION`; no hay tabla `sessions`. Al reiniciar el backend se pierden las sesiones, aceptable en local-first. Si la demo lo requiere, se migrará a Spring Session JDBC.
- `stream_sources`, `model_versions`, `feature_snapshots`
- `collector_sessions`, `ingestion_health`

Constraints clave:

- `wallets.available_cents >= 0`, `wallets.held_cents >= 0`.
- `ledger_entries` suma cero por transacción.
- `bets` unique `(user_id, idempotency_key)`.
- `settlements` unique `bet_id`.
- `game_events` unique `(match_id, event_id)`.
- `odds_history` append-only.
- `audit_logs` append-only.

## API y eventos

- REST para auth, catálogo, mercados, apuestas, wallet, pagos y admin.
- Catálogo actual: `GET /api/catalog/lobby` (público) y `GET /api/live/health`.
- SSE actual: `GET /api/live/stream` con eventos `lobby` y `heartbeat`; en M3 se sumarán cuotas y suspensiones.
- Endpoint interno `/internal/ingest` con HMAC para el colector (M2b).
- `Idempotency-Key` en apuestas, depósitos y retiros.
- OpenAPI como contrato.
- Errores estandarizados sin filtrar detalles internos.

### Evento normalizado

```json
{
  "eventId": "9062061787:12345",
  "matchId": "9062061787",
  "source": "GSI",
  "seq": 12345,
  "gameTime": 1765,
  "receivedAt": "2026-10-25T20:00:00Z",
  "type": "KILL",
  "payload": {}
}
```

### Mensaje SSE actual (M2a)

```text
event: lobby
data: {"live":[...],"recent":[...],"updatedAt":"...","feed":{"source":"OPENDOTA","status":"LIVE",...}}

event: heartbeat
data: {"at":"2026-10-27T03:49:26Z"}
```

### Mensaje SSE futuro (cuotas)

```json
{
  "type": "ODDS_UPDATED",
  "matchId": "9062061787",
  "marketId": "uuid",
  "version": 7,
  "selections": [
    { "id": "radiant", "odds": 1.52 },
    { "id": "dire", "odds": 2.48 }
  ]
}
```

### Apuesta

```json
{
  "marketId": "uuid",
  "selectionId": "radiant",
  "stakeCents": 1000,
  "expectedOdds": 1.72,
  "marketVersion": 5,
  "idempotencyKey": "bet-..."
}
```

## Despliegue

### Desarrollo

- PostgreSQL en Docker.
- Backend, frontend y colector nativos.
- Dota 2 en modo espectador en la misma PC.
- Next.js proxy `/api` → `http://localhost:8081` (el 8080 está ocupado por Jenkins en la PC de desarrollo).

### Presentación en laptop

- Empaquetado Docker Compose o nativo portable.
- Todo corre en la laptop; no depende de LAN.
- Si la laptop tiene menos RAM, PostgreSQL nativo y backend/frontend nativos.
- Probar arranque, GSI, SSE y demo completa antes de la presentación.

## Requisitos no funcionales

- **Latencia:** evento GSI → UI ≤ 2 s p95; recálculo ≤ 500 ms; apuesta ≤ 1 s.
- **Consistencia:** ledger invariante; sin saldos negativos; settlement exactly-once.
- **Disponibilidad:** demo estable 30 min; reconexión SSE; spool del colector.
- **Seguridad:** OWASP ASVS nivel 1/2; RBAC; auditoría; rate limiting.
- **Usabilidad:** responsive; ES/EN; legible en proyector.
- **Observabilidad:** salud del feed, lag, desbalance de ledger, auditoría.
- **Mantenibilidad:** módulos, tests, documentación, ADRs.
- **Portabilidad:** Docker en Windows; ejecución local.

## Riesgos técnicos

- GSI no entrega datos de partidas no espectadas.
- Delay de DotaTV afecta la sensación de tiempo real.
- OpenDota puede limitar requests.
- Concurrencia en wallet y settlement.
- Docker puede consumir RAM en exceso.
- Streaming puede fallar sin internet.

Mitigaciones: modo espectador, híbrido, caché/backoff, tests de concurrencia, Docker solo PostgreSQL, ocultar streaming si falla.

## Decisiones relacionadas

Ver `docs/decisions.md` (ADR-001 a ADR-017).
