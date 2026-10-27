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
| `catalog` | Partidas, equipos, torneos, ratings |
| `live` | Ingesta GSI/OpenDota, estado del partido, salud del feed |
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
- `lib/catalog.ts` consulta OpenDota `/live` y `/proMatches` con timeout de 7 s y revalidate de 30 s. Es una implementación temporal de UI; en M2 el backend será la única fuente.
- `components/home-lobby.tsx` orquesta filtros, lista, bet slip, modales y navegación.
- Componentes: `site-header`, `live-ticker`, `filter-rail`, `match-card`, `bet-slip`, `login-modal`, `match-detail-modal`, `site-footer`, `game-switcher`, `modal`.
- Tokens en `app/globals.css`: navy `#0B1220`, naranja `#F97316`, fondo `#F4F6F8`; tipografía local.
- Sin auth ni cuotas simuladas: el login muestra un aviso de módulo pendiente y las cards indican “Mercados no publicados”.

## Flujo de datos

1. Dota 2 en modo espectador envía GSI al colector local.
2. El colector valida token, normaliza, batchea y envía al backend con HMAC.
3. El backend guarda snapshot/eventos, actualiza el estado del partido y detecta eventos relevantes.
4. El motor de cuotas recalcula mercados afectados, aplica margen, versiona y publica por SSE.
5. OpenDota se consulta periódicamente para catálogo, partidos secundarios, pre-partida y verificación.
6. El usuario apuesta: el backend valida mercado, versión, cuota, límites y saldo; retiene fondos y registra la apuesta.
7. Al terminar el partido, el settlement liquida de forma idempotente, paga al ganador y audita.
8. Depósitos/retiros simulados pasan por la abstracción de pagos y el ledger.

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

> Implementación temporal: el lobby actual hace fetch server-side a OpenDota desde Next.js para validar la UI. En M2 el backend será la única fuente de catálogo y el frontend consumirá `/api`; no se usarán cuotas ni datos simulados.

## Modelo de datos (alto nivel)

- `users`, `roles`, `sessions`
- `wallets`, `ledger_accounts`, `ledger_transactions`, `ledger_entries`
- `matches`, `tournaments`, `teams`, `players`, `match_participants`
- `game_snapshots`, `game_events`, `match_state`
- `markets`, `selections`, `odds_history`, `market_suspensions`
- `bets`, `bet_selections`, `bet_status_history`
- `settlements`, `payouts`
- `deposits`, `withdrawals`, `payment_intents`
- `idempotency_keys`, `audit_logs`, `outbox_events`
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
- SSE para marcador, cuotas, suspensiones y estado de apuestas.
- Endpoint interno `/internal/ingest` con HMAC para el colector.
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

### Mensaje SSE

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
