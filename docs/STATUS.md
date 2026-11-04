# Estado del proyecto

Última actualización: 2026-11-03

> Estado vigente únicamente. El histórico de hitos cerrados vive en `docs/milestones/`.

## Hito actual

**M6 — Producto cerrado (M6a + M6b + M6c, 2026-11-04).** Siguiente: M7 (hardening/demo). M3c sigue bloqueado por falta de calendario pre-partida.

Cerrados: M0 (capturas GSI reales), M1 (identidad y wallet), M2a (catálogo OpenDota + SSE), M2b (partida propia GSI), M3a y M3b (cuatro mercados en vivo con cuotas), M4 (apuestas simples con holds), M5 (liquidación, payout/void, admin y auditoría), M6a (arena visual y sistema de diseño), M6b (streaming oficial y cierre de producto), M6c (copy de producto y saldo administrativo). Detalle en `docs/milestones/`.

## Estado del sistema

- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila y arranca con PostgreSQL real.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; lint y build verdes. Rutas `/`, `/wallet`, `/bets`, `/admin`, `/admin/markets`, `/admin/streams`, `/admin/users` y `/match/[id]`.
- Lobby responsive con cards, filtros, modal de partida con mercados múltiples, bet slip y página de apuestas.
- M6a: lobby y `/match/[id]` usan el tema arena nocturna; wallet, apuestas y admin conservan superficies claras. Header con chip DEMO, tabs En vivo/Resultados, partido destacado, escudos reales, cuotas tipo price tile, estado “en tu boleto” y boleto vacío discreto.
- Escudos: `LobbyTeam.teamId` desde OpenDota y proxy cacheado `GET /api/catalog/teams/{id}/logo`; fallback a monograma si el equipo o el CDN fallan.
- Movimiento de cuota sutil mediante SSE; respeta `prefers-reduced-motion`. Sin cambios en cuotas, settlement ni wallet.
- M6b: streaming oficial Twitch/YouTube con `match_streams` por partida o liga. `GET /api/catalog/lobby` expone `stream`; `/match/[id]` monta `StreamPlayer` click-to-load debajo del scoreboard; el lobby solo muestra CTA “Ver stream” y badges.
- Admin `/admin/streams` asigna provider/canal, activa/desactiva y elimina con auditoría. CSP `frame-src` limitado a Twitch/YouTube. Si no hay stream o el canal está offline, hay fallback sin inventar señal.
- M6c: la UI no muestra “saldo ficticio”, “partidas reales”, “proyecto académico” ni chip DEMO. Footer solo con copyright. El header muestra **Admin** al rol `ADMIN`.
- Admin `/admin/users` busca usuarios y acredita/debita saldo con motivo, ledger `ADMIN_ADJUSTMENT` y auditoría `WALLET_ADMIN_ADJUSTMENT`; el usuario se registra solo, sin cuenta demo fija.
- Catálogo con datos reales de OpenDota; sin fixtures ni datos inventados en el producto.
- Las partidas con `league_id > 0` se priorizan sobre las ranked y muestran el nombre de liga resuelto con `/leagues/{id}` (caché 6 h).
- Cuatro mercados base por partida en vivo (ganador, total de kills, handicap y duración) más tres de eventos GSI (primera sangre, primera torre y siguiente Roshan), con versión e historial append-only.
- Apuestas con validación server-side, holds en el ledger, idempotencia y aislamiento por usuario.
- Auth real con sesión HttpOnly, CSRF y roles; wallet demo con ledger de doble entrada.
- Migraciones aplicadas: V1–V11.
- `match_results` guarda el resultado final verificado de cada partida con mercados cerrados: ganador, scores, duración, `first_blood_time`, `league_id` y `objectives` (JSON) desde OpenDota `/matches/{id}`, con backoff e idempotencia.
- `market_results` resuelve cada mercado una sola vez: `SETTLED` con selección ganadora o `VOID`. Mercado `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP` y `DURATION` según reglas de ADR-028. El mercado pasa a `SETTLED`/`VOID` y no se reabre.
- Colector definitivo: normaliza GSI, deduplica eventos, envía snapshots a 1 Hz, firma con HMAC y usa spool ante caídas.
- `POST /internal/ingest` valida firma y ventana de 5 min; guarda `collector_sessions`, `game_snapshots`, `game_events` e `ingestion_health` con idempotencia.
- La partida propia aparece en el lobby como `source=GSI`; si está activa se convierte en la partida destacada (“Tu partida”). Expone `playersScope=FULL|LOCAL`, pausa y disponibilidad de Roshan.
- Mercados `source=GSI`: se crean aunque OpenDota esté caído o iniciando; una pausa los suspende con `MATCH_PAUSED`.
- Partidas con bots: `practice=true`, stake máximo S/ 100 y etiqueta "Práctica". El resultado sale de GSI (`POST_GAME` + `win_team`).
- Verificación de humo real: payload GSI → colector → backend → lobby con 1 partida GSI, 6 mercados, pausa con 6 mercados suspendidos y `match_results` READY/GSI 44-27.
- M5: `settlements` garantiza una liquidación por apuesta. Gana/pierde/void mueven el ledger con suma cero; `bets` pasa a `WON`/`LOST`/`VOID`; `audit_logs` registra liquidaciones y anulaciones.
- Admin: `POST /api/admin/bets/{id}/void` con rol `ADMIN`, motivo obligatorio, reembolso y auditoría. `/admin` lista apuestas en revisión/pendientes.
- `/bets` muestra estado, pago y fecha de liquidación.
- Mercados GSI de eventos: `FIRST_BLOOD`, `FIRST_TOWER` y `NEXT_ROSHAN` con cuotas fijas 50/50; se crean según el estado (0-0, sin torre, Roshan disponible) y se cierran al llegar el evento.
- Al terminar una partida GSI, `match_results.objectives` se construye desde todos los `game_events`; el resolver acepta formatos GSI y OpenDota.
- `GET /api/matches/{id}` y `/api/matches/{id}/stream` exponen la partida propia; `/match/[id]` muestra marcador, jugadores, net worth, timeline y Roshan por SSE.
- Eventos críticos suspenden mercados 3 s con `EVENT_SUSPENSION`; la pausa usa `MATCH_PAUSED`.
- `close-grace` de 120 s evita cerrar mercados por una desaparición transitoria del feed.
- Admin de mercados: `/admin/markets` permite suspender, reanudar y cambiar cuota; el override sube versión, inserta `odds_history` con `ADMIN_OVERRIDE` y audita con motivo.
- Admin sembrado por configuración; en desarrollo `admin@betpulse.local` / `Admin123!`.
- Colector Javalin definitivo: expone `/health` y `/`, recibe `/gsi`, normaliza, deduplica, firma con HMAC y reenvía al backend con spool ante caídas.
- Liquidación implementada: `settlements` único por apuesta, payout/void, ledger y auditoría. Las apuestas ya no quedan abiertas para siempre.
- Steam `GetLiveLeagueGames` no integrado: falta `STEAM_API_KEY` (rate limit de generación). No bloquea la demo.
- CI: ejecución `99d2681` en verde para backend, colector y frontend; M6c cierra con 100 tests backend locales.

## Próxima acción

1. M7: rate limiting, MFA, CSP completa, E2E, empaquetado y ensayo de demo.
2. M8: fútbol pre-partida (ESPN/OpenLigaDB), luego NBA; sin eventos en vivo.
3. Opcional: M3c si aparece calendario fiable; Steam `GetLiveLeagueGames` si hay API key; pulido admin (usuarios, exposición, salud).

## Pendiente de entorno (opcional)

- `STEAM_API_KEY` para enriquecer el feed pro con draft, torres y Roshan. No bloquea la demo.
- Laptop de presentación: confirmar RAM/OS y probar el empaquetado.

## Bloqueos

- OpenDota no ofrece calendario futuro fiable para M3c.
- Sin `STEAM_API_KEY` no hay draft, torres ni Roshan en vivo; el feed pro funciona con OpenDota.
- `npm audit` reporta 2 vulnerabilidades transitivas de Next.js/PostCSS; se resolverán en M7 o con una actualización mayor planificada.

## Restricción de diseño vigente

El settlement es **agnóstico a la fuente**: consume `market_results` ya resuelto y no consulta OpenDota ni GSI. OpenDota y GSI solo alimentan `match_results`; agregar una fuente nueva no toca el núcleo de pagos.

La **arena** (lobby y detalle de partido) usa tema oscuro; **cuenta y admin** usan tema claro. Los tokens de ambos entornos no se mezclan sin revisar contraste.

El **stream oficial** vive en `/match/[id]`, no en el lobby. El lobby solo muestra CTA “Ver stream”/badge; el iframe se carga con click-to-load y sin autoplay (ADR-036).

La UI no muestra avisos de demo ni “saldo ficticio”; el contexto local se documenta en README/runbook (ADR-037).

## Verificación

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run lint
npm run build
```

Resultados 2026-11-04 (M6):

- Backend: 100/100 tests verdes (M6c suma `AdminUserFlowTest` 2).
- Flyway: V1–V11 aplicadas en Testcontainers.
- Frontend: lint y build verdes; rutas `/`, `/admin`, `/admin/markets`, `/admin/streams`, `/admin/users`, `/bets`, `/match/[id]` y `/wallet` generadas.
- QA visual local con OpenDota real: lobby con CTA “Ver stream”, detalle con player click-to-load y mercados, admin de streams y iframe de Twitch cargado (canal offline en la prueba). Revisado a 1440 px y 390 px. Sin tests visuales automatizados todavía.
- M6c: `/admin/users` probado con un usuario de test; acreditó S/ 250.00, devolvió el saldo y generó auditoría. Copy de producto revisado en lobby, wallet y footer.
- Colector: 11/11 tests verdes y `package` con shade correcto.
- E2E real (2026-11-01): GSI mid-game → 4 mercados base + torre/Roshan → apuesta de S/ 10 a ganador → `POST_GAME` → `WON` con payout S/ 10.96; wallet disponible S/ 100.96 y retenido S/ 0. Liquidación en menos de un minuto.
- CI actual (`99d2681`, 2026-11-04): backend, colector y frontend en verde.
  `https://github.com/Improve872/BetPulse/actions/runs/41764818149`

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
- ¿Segundo monitor para la demo?
- ¿Se intentará integrar Steam `GetLiveLeagueGames` antes de la demo?

## Cómo retomar en una sesión nueva

> "Lee `AGENTS.md` y `docs/STATUS.md`; dime el estado actual y el próximo paso."

No asumir el historial de conversaciones anteriores. Actualizar este archivo al cerrar cada hito.
