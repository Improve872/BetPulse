# Estado del proyecto

Última actualización: 2026-11-01

> Estado vigente únicamente. El histórico de hitos cerrados vive en `docs/milestones/`.

## Hito actual

**M2b — Partida propia (GSI).** Completado: ingesta, lobby, mercados, eventos, SSE por partido, suspensión y cierre con gracia.

Cerrados: M0 (capturas GSI reales), M1 (identidad y wallet), M2a (catálogo OpenDota + SSE), M2b (partida propia GSI), M3a y M3b (cuatro mercados en vivo con cuotas), M4 (apuestas simples con holds), M5 (liquidación, payout/void, admin y auditoría). Detalle en `docs/milestones/`.

## Estado del sistema

- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila y arranca con PostgreSQL real.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; lint y build verdes. Rutas `/`, `/wallet` y `/bets`.
- Lobby responsive con cards, filtros, modal de partida con mercados múltiples, bet slip y página de apuestas.
- Catálogo con datos reales de OpenDota; sin fixtures ni datos inventados en el producto.
- Las partidas con `league_id > 0` se priorizan sobre las ranked y muestran el nombre de liga resuelto con `/leagues/{id}` (caché 6 h).
- Cuatro mercados por partida en vivo con margen propio, versión e historial append-only.
- Apuestas con validación server-side, holds en el ledger, idempotencia y aislamiento por usuario.
- Auth real con sesión HttpOnly, CSRF y roles; wallet demo con ledger de doble entrada.
- Migraciones aplicadas: V1–V9.
- `match_results` guarda el resultado final verificado de cada partida con mercados cerrados: ganador, scores, duración, `first_blood_time`, `league_id` y `objectives` (JSON) desde OpenDota `/matches/{id}`, con backoff e idempotencia.
- `market_results` resuelve cada mercado una sola vez: `SETTLED` con selección ganadora o `VOID`. Mercado `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP` y `DURATION` según reglas de ADR-028. El mercado pasa a `SETTLED`/`VOID` y no se reabre.
- Colector definitivo: normaliza GSI, deduplica eventos, envía snapshots a 1 Hz, firma con HMAC y usa spool ante caídas.
- `POST /internal/ingest` valida firma y ventana de 5 min; guarda `collector_sessions`, `game_snapshots`, `game_events` e `ingestion_health` con idempotencia.
- La partida propia aparece en el lobby como `source=GSI` en la sección "Mi partida", con `playersScope=FULL|LOCAL`, pausa y disponibilidad de Roshan.
- Mercados `source=GSI`: se crean aunque OpenDota esté caído o iniciando; una pausa los suspende con `MATCH_PAUSED`.
- Partidas con bots: `practice=true`, stake máximo S/ 100 y etiqueta "Práctica". El resultado sale de GSI (`POST_GAME` + `win_team`).
- Verificación de humo real: payload GSI → colector → backend → lobby con 1 partida GSI, 4 mercados, pausa con 4 mercados suspendidos y `match_results` READY/GSI 44-27.
- M5: `settlements` garantiza una liquidación por apuesta. Gana/pierde/void mueven el ledger con suma cero; `bets` pasa a `WON`/`LOST`/`VOID`; `audit_logs` registra liquidaciones y anulaciones.
- Admin: `POST /api/admin/bets/{id}/void` con rol `ADMIN`, motivo obligatorio, reembolso y auditoría. `/admin` lista apuestas en revisión/pendientes.
- `/bets` muestra estado, pago y fecha de liquidación.
- Mercados GSI de eventos: `FIRST_BLOOD`, `FIRST_TOWER` y `NEXT_ROSHAN` con cuotas fijas 50/50; se crean según el estado (0-0, sin torre, Roshan disponible) y se cierran al llegar el evento.
- Al terminar una partida GSI, `match_results.objectives` se construye desde todos los `game_events`; el resolver acepta formatos GSI y OpenDota.
- `GET /api/matches/{id}` y `/api/matches/{id}/stream` exponen la partida propia; `/match/[id]` muestra marcador, jugadores, net worth, timeline y Roshan por SSE.
- Eventos críticos suspenden mercados 3 s con `EVENT_SUSPENSION`; la pausa usa `MATCH_PAUSED`.
- `close-grace` de 120 s evita cerrar mercados por una desaparición transitoria del feed.
- Admin sembrado por configuración; en desarrollo `admin@betpulse.local` / `Admin123!`.
- Colector Javalin compila y expone `/health` y `/gsi`; sin reenvío al backend (M2b diferido).
- **No hay liquidación**: las apuestas quedan `PLACED` y el saldo retenido no se paga ni se libera.
- Steam `GetLiveLeagueGames` no integrado: falta `STEAM_API_KEY` (rate limit de generación).
- CI: backend 56 tests verdes; frontend lint/build verdes (última verificación local).

## Próxima acción

1. Panel admin de mercados (suspender/reanudar/override) y ajustes manuales de cuota.
2. M3c cuando exista una fuente pre-partida fiable (calendario/Liquipedia).
3. Preparar el guion de demo y probar el flujo completo en la laptop.
4. Integrar Steam `GetLiveLeagueGames` si aparece la API key.

## Pendiente de entorno (no bloquea M5)

- Activar `-gamestateintegration` en Dota 2 y capturar payloads reales. Desbloquea M0, M2b y los mercados de primera sangre, primera torre y siguiente Roshan. Requiere abrir el juego, no una sesión de código.

## Bloqueos

- M2b (ingesta GSI) sigue diferido: hay capturas reales, pero el producto ya no depende de GSI para la demo; los mercados de eventos al segundo esperan a M2b.
- OpenDota no ofrece calendario futuro fiable para M3c.
- Sin `STEAM_API_KEY` no hay draft, torres ni Roshan en vivo; el feed pro funciona con OpenDota.
- `npm audit` reporta 2 vulnerabilidades transitivas de Next.js/PostCSS; se resolverán en M7 o con una actualización mayor planificada.

## Restricción de diseño para M5

Los cuatro mercados actuales se resuelven con OpenDota, pero primera sangre, primera torre y siguiente Roshan dependerán de GSI. El settlement debe ser **agnóstico al tipo de mercado**: consume un resultado ya resuelto, no consulta la fuente. Así M2b solo añade un resolvedor sin tocar el núcleo.

## Verificación

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run lint
npm run build
```

Resultados 2026-11-01:

- Backend: 88/88 tests verdes (Bet 10, CatalogController 3, CatalogService 5, Auth 7, MarketService 11, MarketController 1, OddsEngine 7, Wallet 8, Health 1, MatchResultService 5, MatchResultFlow 2, MarketOutcomeResolver 10, MarketResultFlow 3, IngestFlow 8, SettlementFlow 7).
- Flyway: V1–V9 aplicadas en Testcontainers.
- Frontend: lint y build verdes; rutas `/`, `/admin`, `/bets`, `/match/[id]` y `/wallet` generadas.
- Colector: 11/11 tests verdes y `package` con shade correcto.
- CI anterior (2026-10-29, `60ea4c3`): backend, colector y frontend en verde.

Verificación funcional anterior (2026-10-27): 24 mercados abiertos (4 por partida en 6 partidas en vivo); E2E registro → depósito S/ 100 → apuesta S/ 10 → `PLACED` con disponible S/ 90 y retenido S/ 10.

## Entorno

- Windows 11 Pro, 13.9 GB de RAM visible (16 GB nominales).
- Java 21.0.7 (Temurin); Node 24.11.1, npm 11.6.2.
- Maven Wrapper en backend y colector.
- Docker Desktop; PostgreSQL 17.11 en `betpulse-postgres` (puerto `5432`).
- Dota 2 en `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta`.
- Puerto `8080` ocupado por Jenkins; backend en `8081`.
- Un solo desarrollador, una sola PC, local-first; empaquetado para laptop al final.

## Preguntas abiertas

- RAM/OS exactos de la laptop de presentación.
- Fuente principal de demo.
- ¿Segundo monitor para la demo?

## Cómo retomar en una sesión nueva

> "Lee `AGENTS.md` y `docs/STATUS.md`; dime el estado actual y el próximo paso."

No asumir el historial de conversaciones anteriores. Actualizar este archivo al cerrar cada hito.
