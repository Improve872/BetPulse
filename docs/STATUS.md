# Estado del proyecto

Última actualización: 2026-10-28

> Estado vigente únicamente. El histórico de hitos cerrados vive en `docs/milestones/`.

## Hito actual

**M5 — Liquidación exactly-once.** No iniciado.

Cerrados: M1 (identidad y wallet), M2a (catálogo OpenDota + SSE), M3a y M3b (cuatro mercados en vivo con cuotas), M4 (apuestas simples con holds). Detalle en `docs/milestones/`.

## Estado del sistema

- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila y arranca con PostgreSQL real.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; lint y build verdes. Rutas `/`, `/wallet` y `/bets`.
- Lobby responsive con cards, filtros, modal de partida con mercados múltiples, bet slip y página de apuestas.
- Catálogo con datos reales de OpenDota; sin fixtures ni datos inventados en el producto.
- Cuatro mercados por partida en vivo con margen propio, versión e historial append-only.
- Apuestas con validación server-side, holds en el ledger, idempotencia y aislamiento por usuario.
- Auth real con sesión HttpOnly, CSRF y roles; wallet demo con ledger de doble entrada.
- Migraciones aplicadas: V1–V4.
- Admin sembrado por configuración; en desarrollo `admin@betpulse.local` / `Admin123!`.
- Colector Javalin compila y expone `/health` y `/gsi`.
- **No hay liquidación**: las apuestas quedan `PLACED` y el saldo retenido no se paga ni se libera.
- CI en `.github/workflows/ci.yml`; lockfile del frontend corregido, falta publicar para confirmar verde.

## Próxima acción

1. Publicar el commit `23e6a61` (M3b + M4 + corrección de lockfile) y confirmar CI verde.
2. Implementar M5: liquidación exactly-once, payout/void y actualización de wallet.
3. Añadir el panel admin de mercados (suspender/reanudar/override).
4. M3c cuando exista una fuente pre-partida fiable.

## Pendiente de entorno (no bloquea M5)

- Activar `-gamestateintegration` en Dota 2 y capturar payloads reales. Desbloquea M0, M2b y los mercados de primera sangre, primera torre y siguiente Roshan. Requiere abrir el juego, no una sesión de código.

## Bloqueos

- Sin fixtures GSI reales, M2b y los mercados basados en eventos no avanzan. `AGENTS.md` prohíbe simularlos.
- OpenDota no ofrece calendario futuro fiable para M3c.
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

Resultados 2026-10-28:

- Backend: 49/49 tests verdes (Bet 9, CatalogController 3, CatalogService 5, Auth 7, MarketService 8, MarketController 1, OddsEngine 7, Wallet 8, Health 1).
- Frontend: lint y build verdes; rutas `/`, `/bets` y `/wallet` generadas.
- Flyway: V1–V4 aplicadas en Testcontainers.

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
