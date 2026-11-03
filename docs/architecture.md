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
| `live` | Ingesta GSI, snapshots/eventos, SSE de lobby y por partido, salud del feed y resultados finales (`match_results`) |
| `markets` | Mercados, selecciones, versiones, suspensiones y resultados por mercado (`market_results`) |
| `odds` | Modelos, probabilidad, margen, historial |
| `betting` | Bet slip, validación, holds, límites |
| `wallet` | Ledger, saldos, depósitos/retiros simulados |
| `settlement` | Liquidación exactly-once, payout, void y anulación administrativa |
| `payments` | Abstracción de proveedor simulado |
| `admin` | Suspender/reanudar mercados, override de cuota, anulación de apuestas y auditoría |
| `audit` | Bitácora inmutable de acciones |
| `shared` | Errores, dinero, eventos, utilidades |

## Frontend actual

- `app/page.tsx` es un server component dinámico; obtiene el lobby con `getLobbyData()`.
- `lib/catalog.ts` consulta el backend en `BACKEND_URL` (por defecto `http://127.0.0.1:8081`) vía `GET /api/catalog/lobby`, con timeout de 7 s y `cache: "no-store"`. Si el backend no responde, devuelve lobby vacío con `feed.status=DOWN`.
- `lib/live.ts` abre `EventSource("/api/live/stream")`, escucha `lobby`, `markets` y `heartbeat`, y expone `data`, `markets`, `connection` (`connecting|connected|disconnected`) y `retry` a `HomeLobby`.
- `components/home-lobby.tsx` usa el snapshot inicial del servidor y lo reemplaza con cada evento SSE; muestra estado de conexión/feed en ES/EN y orquesta partido destacado, tabs En vivo/Resultados, rail de torneos, lista, bet slip, modales y navegación.
- Componentes de arena: `featured-match`, `match-card`, `odds-button`, `team-crest`, `lobby-tabs`, `filter-rail`, `live-ticker`, `bet-slip`, `match-detail-modal` y `match-detail-page`.
- Tokens en `app/globals.css`: arena `#070D18`, superficies `#0F1A2C`/`#142136`, líneas `#223149`, texto `#F8FAFC`, muted `#94A3B8`, naranja `#F97316`; el tema claro de cuenta conserva `--color-paper` y `--color-surface`. Tipografía local con números tabulares.
- Superficies: lobby y `/match/[id]` son “arena” oscura; `/wallet`, `/bets`, `/admin` y `/admin/markets` son “cuenta” claras.
- Escudos: `LobbyTeam.teamId` viaja desde el catálogo; `TeamCrest` consume `GET /api/catalog/teams/{id}/logo`, que redirige al CDN cacheado por `TeamLogoCache`. Fallback a monograma.
- `OddsButton` muestra etiqueta + cuota, estado suspendido, estado “en tu boleto” y flash breve cuando la cuota cambia; respeta `prefers-reduced-motion`.
- Auth y wallet implementados: modal de login/registro contra la API, sesión con cookie HttpOnly + CSRF, header autenticado y página `/wallet` con depósitos/retiros demo e historial.
- M3a/M3b implementados: `lib/markets.ts` obtiene `GET /api/markets/live`; cards y modal muestran cuatro mercados por partida, línea, versión y estado de suspensión.
- M4 implementado: bet slip y modal móvil permiten elegir cuota y stake; `lib/bets.ts` llama a `/api/bets` con idempotencia. `/bets` muestra el historial privado.
- M5 implementado: `/bets` muestra estado, pago y fecha de liquidación; `/admin` lista apuestas en revisión/pendientes y permite anular con motivo (rol `ADMIN`).
- M2b implementado: `/match/[id]` muestra la partida propia en vivo por SSE (marcador, jugadores, net worth, timeline y Roshan). El enlace aparece en la card de "Mi partida".
- Admin de mercados implementado: `/admin/markets` lista mercados y permite suspender, reanudar o cambiar cuota; cada acción se audita y, en override, sube versión e inserta `odds_history`.

## Flujo de datos

1. Dota 2 (espectando o jugando) envía GSI al colector local.
2. El colector valida token, normaliza, deduplica eventos, envía snapshots a 1 Hz y firma con HMAC; si el backend cae, guarda en spool.
3. El backend valida firma, guarda `game_snapshots`/`game_events`, actualiza `GsiLiveRegistry` y fusiona la partida en el lobby con `source=GSI`. Al terminar, guarda `match_results` con `source=GSI`.
4. El poller OpenDota refresca el catálogo cada 30 s; `CatalogService` publica un evento interno y `LiveFeedService` lo difunde por SSE (`lobby`).
5. El motor de cuotas recalcula los mercados `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP` y `DURATION` en cada refresco del catálogo, aplica margen, versiona si cambian las cuotas y publica por SSE (M3a/M3b).
6. OpenDota se consulta periódicamente para catálogo, partidos secundarios, pre-partida y verificación.
7. El usuario apuesta: el backend valida mercado, versión, cuota, límites y saldo; retiene fondos, registra la apuesta y su estado inicial `PLACED` (M4).
8. Cuando los mercados de una partida se cierran, `MatchResultService` encola `match_results` y consulta OpenDota `/matches/{id}` con backoff hasta guardar el resultado final y los objetivos (primera sangre, torres, Roshan).
9. `MarketResultService` convierte ese resultado en un resultado por mercado (`market_results`): `SETTLED` con selección ganadora o `VOID`, y cierra el mercado como `SETTLED`/`VOID`. Es idempotente.
10. `SettlementService` liquida cada apuesta una sola vez desde `market_results`: paga al ganador, mueve el stake a la casa o reembolsa el void, actualiza `bets` y escribe `audit_logs`. El admin puede anular con motivo.
11. Depósitos/retiros simulados pasan por la abstracción de pagos y el ledger.

## Fuente híbrida

| Fuente | Uso | Frecuencia | Calidad |
|---|---|---|---|
| GSI | Partido propio (espectando o bots) | 1 Hz al backend | Alta; en bots solo datos locales |
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

> Implementación del feed competitivo (2026-11-01): las partidas con `league_id > 0` de OpenDota `/live` se priorizan sobre las ranked y muestran el nombre de liga resuelto con `/leagues/{id}` (caché de 6 h). No hace falta espectar ni abrir Dota 2: las cuotas se mueven con marcador y tiempo. Steam `GetLiveLeagueGames` queda como enriquecimiento opcional cuando exista API key. Al cerrarse los mercados de un partido, `MatchResultService` persiste el resultado final en `match_results` para M5.

> Implementación "Mi partida" (2026-11-01): el colector definitivo normaliza GSI, deduplica eventos, envía a 1 Hz, firma con HMAC y usa spool ante caídas. El backend expone `POST /internal/ingest`, guarda snapshots/eventos e incorpora la partida al lobby con `source=GSI`. La UI la muestra en una sección separada; en modo bots se etiqueta "Práctica" y el stake se limita a S/ 100. Al recibir `POST_GAME`, el resultado se guarda con `source=GSI` para M5.

> Mercados de eventos (2026-11-01): en partidas GSI se publican además `FIRST_BLOOD`, `FIRST_TOWER` y `NEXT_ROSHAN` con cuotas 50/50 (margen 6%). Se cierran al llegar el evento; Roshan solo en espectador. Al terminar, `match_results.objectives` se arma desde todos los `game_events`, y el resolver acepta formatos GSI y OpenDota.

> SSE por partido y cierre con gracia (2026-11-01): `GET /api/matches/{id}` y `/api/matches/{id}/stream` exponen la partida propia completa; `IngestService` publica cada snapshot. Los eventos críticos suspenden mercados 3 s (`EVENT_SUSPENSION`) y la pausa usa `MATCH_PAUSED`. `close-grace` (120 s) evita cerrar mercados por una desaparición transitoria del feed.

## Modelo de datos (alto nivel)

- `users`, `roles`
- `wallets`, `ledger_accounts`, `ledger_transactions`, `ledger_entries`
- `idempotency_keys`
- `matches`, `tournaments`, `teams`, `players`, `match_participants`
- `collector_sessions`, `game_snapshots`, `game_events`, `ingestion_health`
- `match_results` (resultado final verificado y objetivos de la partida)
- `market_results` (resultado por mercado: ganador o void)
- `settlements` (liquidación única por apuesta, con transacción de ledger)
- `audit_logs` (append-only: liquidaciones y anulaciones)
- `markets.source` (`OPENDOTA`/`GSI`) y `markets.practice` (partida local)
- `game_snapshots`, `game_events`, `match_state`
- `markets`, `selections`, `odds_history`, `market_suspensions`
- `bets`, `bet_selections`, `bet_status_history`
- `settlements`, `payouts`
- `deposits`, `withdrawals`, `payment_intents`
- `idempotency_keys`, `audit_logs`, `outbox_events`

> Sesión de M1: `HttpSession` en memoria con cookie `BETPULSE_SESSION`; no hay tabla `sessions`. Al reiniciar el backend se pierden las sesiones, aceptable en local-first. Si la demo lo requiere, se migrará a Spring Session JDBC.

> Implementación actual: V3 crea `markets`, `selections` y `odds_history`; V4 crea `bets` y `bet_status_history`. Las apuestas simples guardan snapshots de mercado, selección, versión y cuota aceptada, y referencian la transacción de hold del ledger.
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
- Catálogo actual: `GET /api/catalog/lobby` (público), `GET /api/catalog/teams/{teamId}/logo` (redirección cacheada al CDN de escudos), `GET /api/markets/live` (público) y `GET /api/live/health`.
- Apuestas autenticadas: `POST /api/bets` con `Idempotency-Key`, `GET /api/bets` y `GET /api/bets/{id}`.
- SSE actual: `GET /api/live/stream` con eventos `lobby`, `markets` y `heartbeat`. Los eventos de mercados se emiten después del commit de la sincronización.
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

Ver `docs/decisions.md` (ADR-001 a ADR-025).
