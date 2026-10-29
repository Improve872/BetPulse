# Estado del proyecto

Última actualización: 2026-10-27

## Hito actual

M3a, M3b y M4 cerrados funcionalmente (pendiente CI verde): hay cuatro mercados en vivo por partida, cuotas propias versionadas y apuestas simples con retención de saldo. M1 y M2a siguen funcionales. M0 queda abierto únicamente por la captura GSI real; M2b está diferido hasta tener fixtures. La liquidación (M5), el panel admin de mercados y M3c (modelo pre-partida con Elo) siguen pendientes.

## M4 — apuestas simples y holds (2026-10-27)

Realizado:

- Migración `V4__betting.sql`: `bets` y `bet_status_history` append-only.
- `POST /api/bets` autenticado, con `Idempotency-Key` obligatoria y `UNIQUE (user_id, idempotency_key)`.
- Validación server-side de mercado abierto, selección, `marketVersion`, `expectedOdds` y stake.
- El stake se retiene en la misma transacción con `USER_AVAILABLE` → `USER_HELD`; la apuesta guarda la transacción de hold.
- Límites iniciales: stake entre S/ 1.00 y S/ 1,000.00; payout potencial máximo S/ 10,000.00.
- Replay idempotente devuelve la misma apuesta sin retener dos veces; una misma clave con datos distintos devuelve conflicto.
- `GET /api/bets` y `GET /api/bets/{id}` filtran siempre por el usuario de la sesión.
- Frontend: bet slip real, stake, payout potencial, estados de error, selección desde cards o modal, panel móvil y página `/bets`.
- Tests: `BetFlowTest` 9 (hold, replay, mismatch, versión/cuota obsoleta, mercado suspendido, fondos insuficientes, payout máximo, aislamiento por usuario, concurrencia y CSRF).

Pendiente de M5:

- Liquidación exactly-once, payout/void, actualización de wallet y auditoría de settlement.
- Cancelación de apuestas y estados `NEEDS_REVIEW` operativos.
- Exposición agregada y límites por usuario/mercado.

## M3b — más mercados en vivo con OpenDota (2026-10-27)

Realizado:

- Cuatro mercados por partida en vivo: `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP` y `DURATION`.
- Las líneas se fijan al crear el mercado y se guardan en `markets.line`.
- `TOTAL_KILLS`: línea por ritmo esperado de kills y probabilidad Poisson.
- `KILL_HANDICAP`: línea `diferencia actual + 0.5` y probabilidad normal sobre la diferencia final.
- `DURATION`: línea `max(40.5, minuto actual + 5.5)` y supervivencia exponencial.
- Cierre determinista de `TOTAL_KILLS` y `DURATION` cuando el resultado ya no puede cambiar; `CLOSED` no se reabre.
- `GET /api/markets/live` y SSE `markets` devuelven todos los mercados con línea, versión y estado.
- Frontend: contador de mercados por card, listado completo en el modal, etiquetas de over/under y hándicap.
- Tests: `MarketServiceTest` 8, `OddsEngineTest` 7, `MarketControllerTest` 1.
- Primera sangre, primera torre y siguiente Roshan quedan para M2b/M5 porque requieren eventos GSI.

## M3a — mercado ganador y motor base (2026-10-27)

- Mercado `MATCH_WINNER` con `RADIANT`/`DIRE`, margen del 6%, límites `[0.08, 0.92]` y cuotas a 3 decimales.
- Migración V3: `markets`, `selections`, `odds_history` append-only.
- Sincronización transaccional desde el catálogo, historial por versión, suspensión por feed y cierre al salir de vivo.
- SSE de mercados publicado después del commit.
- Adaptador para desconexiones SSE sin generar errores de respuesta.

## M2a — catálogo OpenDota y SSE (2026-10-26)

- `OpenDotaClient` (`/live`, `/proMatches`), poller con timeout de 7 s, intervalo de 30 s y backoff 30 s → 5 min.
- Caché en memoria y salud `STARTING/LIVE/DEGRADED/STALE/DOWN`.
- `GET /api/catalog/lobby` y SSE `GET /api/live/stream` con `lobby`, `markets` y `heartbeat`.
- Frontend con snapshot inicial, actualización por SSE y badge de salud del feed.

## Estado

- Documentación base completa.
- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila y arranca con PostgreSQL real.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; build y lint verdes.
- Lobby responsive tipo casa de apuestas con cards, filtros, modal de partido, bet slip y página de apuestas.
- Catálogo con datos reales de OpenDota; sin fixtures ni datos inventados en el producto.
- Mercados: 4 por partida en vivo, cuotas con margen propio, versión e historial append-only.
- Apuestas: validation server-side, holds en el ledger, idempotencia y aislamiento por usuario.
- Autenticación real con sesión HttpOnly, CSRF y roles; wallet demo con ledger de doble entrada.
- Migraciones aplicadas: V1, V2, V3 y V4.
- Admin sembrado por configuración; en desarrollo `admin@betpulse.local` / `Admin123!`.
- Colector Javalin compila y expone `/health` y `/gsi`.
- PostgreSQL 17.11 en Docker (`betpulse-postgres`).
- No hay liquidación ni ingesta GSI todavía. Las apuestas quedan `PLACED` hasta M5.
- CI en `.github/workflows/ci.yml`; la primera ejecución falló por el lockfile del frontend, ya corregido localmente. Falta publicar y confirmar verde.

## Entorno

- Windows 11 Pro, 13.9 GB de RAM visible (16 GB nominales).
- Java 21.0.7 (Temurin).
- Node 24.11.1, npm 11.6.2; lockfile validado también con npm 10.9.4.
- Maven Wrapper en backend y colector.
- Docker Desktop instalado; engine 29.9.2. PostgreSQL 17.11 en `betpulse-postgres` (puerto `5432`, healthcheck `healthy`).
- Dota 2: `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta`.
- Puerto `8080` ocupado por Jenkins; BetPulse backend usa `8081`.
- Presentación: laptop propia; se empaquetará al final.
- Estrategia: local-first; sin LAN ni nube en la primera etapa.
- Un solo desarrollador.

## Decisiones cerradas

- Nombre: BetPulse.
- Stack: Java 21 + Spring Boot 3 + Maven; Next.js 15 + React 19 + TypeScript + Tailwind; PostgreSQL + Flyway; SSE.
- Dinero: PEN ficticio, guardado en céntimos.
- Fuente: GSI para partido espectado; OpenDota para catálogo, secundarios, pre-partida y verificación.
- Motor de cuotas propio.
- UI español por defecto + selector ES/EN.
- Streaming oficial Twitch/YouTube.
- Sin parlays/cashout en el MVP.
- Registro de usuarios + admin.
- Docker solo para PostgreSQL en dev; empaquetado para laptop al final.
- Backend de desarrollo en `8081` por conflicto con Jenkins en `8080` (ADR-018).
- Lobby light-first, multi-juego y con datos reales (ADR-019).
- Identidad y wallet de M1 con sesión + CSRF, BCrypt 12, ledger SQL y triggers (ADR-020).
- Catálogo OpenDota en backend + SSE de lobby con salud de feed (ADR-021).
- Mercado ganador en vivo y motor de cuotas M3a (ADR-022).
- M2b diferido hasta contar con payloads GSI reales (ADR-023).
- Mercados M3b calculables con OpenDota y líneas fijas (ADR-024).
- Apuestas simples con holds, idempotencia y validación de cuota/versión (ADR-025).

## Hecho

- Documentación base y plan por hitos.
- Backend base, Flyway, PostgreSQL, Spring Security y `/api/health`.
- Frontend base con Next.js, React, Tailwind e i18n ES/EN.
- Rediseño del lobby y componentes de catálogo, modales y wallet.
- Colector Javalin con `/gsi`, `/health` y persistencia local.
- Docker Compose con PostgreSQL 17 y smoke completo `3000` → `8081` → PostgreSQL.
- V2 de identidad, wallet, ledger e idempotencia con triggers.
- Auth real, wallet demo, holds/releases e historial.
- Tests de auth, wallet, ledger e idempotencia con Testcontainers.
- Catálogo OpenDota M2a con poller, salud y tests.
- SSE de lobby con snapshot, broadcast y heartbeat.
- V3 de mercados, selecciones e historial append-only.
- Motor de cuotas M3a y sincronización transaccional.
- M3b con cuatro mercados en vivo y UI de mercados múltiples.
- V4 de apuestas y bet status history.
- API de apuestas, hold transaccional, idempotencia y tests de concurrencia.
- Bet slip funcional y página `/bets`.
- CI básico para backend, frontend y colector.

## Verificación

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run lint
npm run build
```

Resultados 2026-10-27:

- Backend: 49/49 tests verdes (Bet 9, CatalogController 3, CatalogService 5, Auth 7, MarketService 8, MarketController 1, OddsEngine 7, Wallet 8, Health 1).
- Frontend: lint y build verdes; rutas `/`, `/wallet` y `/bets` generadas.
- Flyway: V1–V4 aplicadas en Testcontainers y en la base local.
- Catálogo real: 24 mercados abiertos (4 por cada una de las 6 partidas en vivo) con línea, versión y cuotas a 3 decimales.
- SSE: snapshot `lobby`, snapshot `markets` y heartbeats.
- E2E vía proxy de Next.js: registro → depósito S/ 100.00 → apuesta de S/ 10.00 → `PLACED`; disponible S/ 90.00, retenido S/ 10.00 y una apuesta en historial.
- SSR: el lobby devuelve cards con “4 mercados” y cuotas reales; `/bets` renderiza correctamente.
- CI: la primera ejecución del push `67f6bfd` terminó con backend y collector verdes; frontend falló en `npm ci` por lockfile desincronizado. El lockfile fue corregido y validado con npm 10; falta publicar para reejecutar.

## Próxima acción

1. Publicar M3b + M4, la corrección del lockfile y los cambios de docs; confirmar CI verde.
2. Implementar M5: liquidación exactly-once, payout/void y actualización de wallet.
3. Añadir el panel admin de mercados (suspender/reanudar/override) y M3c cuando exista una fuente pre-partida.
4. Cuando sea posible, activar `-gamestateintegration` y capturar payloads reales para cerrar M0 y crear fixtures de M2b.
5. Actualizar este archivo al cerrar cada hito.

## Bloqueos

- Captura GSI real pendiente; M2b y los mercados de primera sangre/torre/Roshan no avanzan sin fixtures.
- No hay liquidación: las apuestas permanecen `PLACED` y el saldo retenido no se paga ni se libera todavía.
- OpenDota no ofrece calendario futuro fiable para M3c.
- CI de frontend pendiente de reejecución tras el push.
- `npm audit` reporta 2 vulnerabilidades transitivas de Next.js/PostCSS; se resolverán en M7 o con una actualización mayor planificada.

## Preguntas abiertas

- RAM/OS exactos de la laptop de presentación.
- Fuente principal de demo.
- ¿Segundo monitor para la demo?

## Cómo retomar en una sesión nueva

Pedir al agente:

> “Lee `AGENTS.md` y `docs/STATUS.md`; dime el estado actual y el próximo paso.”

No asumir el historial del chat. Actualizar este archivo al cerrar cada hito.
