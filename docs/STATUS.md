# Estado del proyecto

Última actualización: 2026-11-01

> Estado vigente únicamente. El histórico de hitos cerrados vive en `docs/milestones/`.

## Hito actual

**Pre-M5 — Feed competitivo y resultados finales.** Completado. M5 (liquidación exactly-once) no iniciado.

Cerrados: M1 (identidad y wallet), M2a (catálogo OpenDota + SSE), M3a y M3b (cuatro mercados en vivo con cuotas), M4 (apuestas simples con holds). M0 cerrado con capturas GSI reales (DotaTV y bots); M2b (ingesta GSI) queda diferido. Detalle en `docs/milestones/`.

## Estado del sistema

- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila y arranca con PostgreSQL real.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; lint y build verdes. Rutas `/`, `/wallet` y `/bets`.
- Lobby responsive con cards, filtros, modal de partida con mercados múltiples, bet slip y página de apuestas.
- Catálogo con datos reales de OpenDota; sin fixtures ni datos inventados en el producto.
- Las partidas con `league_id > 0` se priorizan sobre las ranked y muestran el nombre de liga resuelto con `/leagues/{id}` (caché 6 h).
- Cuatro mercados por partida en vivo con margen propio, versión e historial append-only.
- Apuestas con validación server-side, holds en el ledger, idempotencia y aislamiento por usuario.
- Auth real con sesión HttpOnly, CSRF y roles; wallet demo con ledger de doble entrada.
- Migraciones aplicadas: V1–V5.
- `match_results` guarda el resultado final verificado de cada partida con mercados cerrados: ganador, scores, duración, `first_blood_time`, `league_id` y `objectives` (JSON) desde OpenDota `/matches/{id}`, con backoff e idempotencia.
- Admin sembrado por configuración; en desarrollo `admin@betpulse.local` / `Admin123!`.
- Colector Javalin compila y expone `/health` y `/gsi`; sin reenvío al backend (M2b diferido).
- **No hay liquidación**: las apuestas quedan `PLACED` y el saldo retenido no se paga ni se libera.
- Steam `GetLiveLeagueGames` no integrado: falta `STEAM_API_KEY` (rate limit de generación).
- CI: backend 56 tests verdes; frontend lint/build verdes (última verificación local).

## Próxima acción

1. V6: `market_results` (resultado por mercado) y reglas de settlement por tipo en un ADR.
2. Cierre robusto de mercados: ventana de gracia y confirmación con `/matches/{id}` antes de cerrar.
3. M5: liquidación exactly-once, payout/void y actualización de wallet.
4. Panel admin de mercados (suspender/reanudar/override).
5. M3c cuando exista una fuente pre-partida fiable.

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

- Backend: 56/56 tests verdes (Bet 9, CatalogController 3, CatalogService 5, Auth 7, MarketService 8, MarketController 1, OddsEngine 7, Wallet 8, Health 1, MatchResultService 5, MatchResultFlow 2).
- Flyway: V1–V5 aplicadas en Testcontainers.
- Frontend: sin cambios en este bloque; última verificación 2026-10-28 con lint y build verdes.
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
