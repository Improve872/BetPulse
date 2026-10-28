# Estado del proyecto

Última actualización: 2026-10-26

## Hito actual

M2a cerrado: el backend es la única fuente del catálogo OpenDota, expone `GET /api/catalog/lobby` y emite el lobby por SSE (`/api/live/stream`), y el frontend ya consume ambos con indicador de salud del feed. M1 sigue funcional (auth + wallet + tests). M0 queda abierto solo por la captura GSI real; por decisión del usuario, GSI no bloquea el avance y M2b se hará cuando existan payloads reales. CI básico agregado en `.github/workflows/ci.yml`, pendiente de ejecutarse en GitHub.

## M2a — cerrado (2026-10-26)

Realizado:

- `catalog`: `OpenDotaClient` (`/live`, `/proMatches`), `OpenDotaProperties`, `CatalogConfig`, DTOs, `CatalogService`, `CatalogScheduler` y `CatalogController`.
- Poller con timeout de 7 s, intervalo de 30 s, backoff 30 s → 5 min, caché en memoria y salud `STARTING/LIVE/DEGRADED/STALE/DOWN`.
- `GET /api/catalog/lobby` con `live`, `recent`, `updatedAt` y `feed`.
- SSE `GET /api/live/stream` con snapshot inicial, evento `lobby` por refresco y `heartbeat` cada 15 s; `GET /api/live/health`.
- Frontend: `getLobbyData()` contra `BACKEND_URL`, hook `useLobbyFeed`, badge de feed ES/EN y actualización sin recarga.
- Tests: `CatalogServiceTest` 5, `CatalogControllerTest` 3; suite total 24/24.
- Smoke REST/SSE vía proxy `3000` y `next start`; E2E headless en 1440/390 sin overflow.

Pendiente:

- M2b: `/internal/ingest` con HMAC, `game_snapshots`, `game_events`, proyector de estado y SSE por partido.
- Captura GSI real y fixtures para probar M2b sin simulación en el producto.
- Persistencia del catálogo OpenDota (hoy solo caché en memoria).

## Estado

- Documentación base completa.
- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila, arranca con PostgreSQL real y expone `/api/health` y `/actuator/health`.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; build y lint verdes.
- Lobby rediseñado como casa de apuestas: header navy, acento naranja, ticker de partidas, filtros, cards, bet slip y modales. Responsive verificado en 1440, 1024 y 390 px.
- Datos reales de OpenDota (`/live` y `/proMatches`) servidos por el backend; sin fixtures ni cuotas inventadas. Los mercados muestran “Mercados no publicados”.
- Backend de catálogo M2a: poller OpenDota con caché en memoria, timeout de 7 s, intervalo de 30 s, backoff exponencial de 30 s a 5 min y salud `STARTING/LIVE/DEGRADED/STALE/DOWN`; `GET /api/catalog/lobby` devuelve `live`, `recent`, `updatedAt` y `feed`.
- SSE de lobby: `GET /api/live/stream` envía `lobby` al conectar y en cada refresco, más `heartbeat` cada 15 s. El frontend muestra badge de feed y se actualiza sin recargar.
- Frontend migrado: `lib/catalog.ts` consulta el backend (`BACKEND_URL`, por defecto `http://127.0.0.1:8081`); `lib/live.ts` mantiene el `EventSource`; `HomeLobby` usa el snapshot inicial + SSE.
- Autenticación real: registro, login, logout, sesión con cookie `BETPULSE_SESSION` (HttpOnly, SameSite=Lax), CSRF ligado a sesión y roles `USER`/`ADMIN`. El modal de login/registro ya llama a la API.
- Wallet demo real: saldo disponible/retenido, depósitos y retiros simulados, holds/releases, ledger de doble entrada, `idempotency_keys`, locks `FOR UPDATE` y triggers de suma cero/append-only.
- Migración `V2__identity_wallet_ledger.sql` aplicada: usuarios, roles, wallets, cuentas de ledger, transacciones, asientos e idempotencia.
- Admin sembrado por configuración (`ADMIN_EMAIL`/`ADMIN_PASSWORD`); en desarrollo usa `admin@betpulse.local` / `Admin123!` y registra una advertencia de contraseña por defecto.
- UI de billetera en `/wallet`: saldo, depósito/retiro demo, montos rápidos, historial, estados de carga/error/vacío, login requerido y navegación autenticada.
- Tests backend con Testcontainers: 24/24 verdes (`CatalogControllerTest` 3, `CatalogServiceTest` 5, `AuthFlowTest` 7, `WalletFlowTest` 8, `HealthControllerTest` 1).
- Colector Javalin 6.7.0; compila, `/health` y `/gsi` probados con payload de prueba.
- Backend movido a `8081` porque Jenkins ocupa `8080`; el proxy de Next.js apunta a `8081`.
- PostgreSQL 17.11 en Docker (`betpulse-postgres`) con healthcheck; Flyway aplicó `V1__baseline.sql` y `V2__identity_wallet_ledger.sql`.
- GSI `.cfg` instalado en Dota 2; falta activar `-gamestateintegration` y capturar una partida real.
- No hay mercados, apuestas, liquidación ni ingesta GSI todavía; el catálogo OpenDota y el SSE de lobby ya son backend. La ingesta GSI (M2b) espera fixtures reales.
- CI básico definido para backend (Testcontainers), frontend (lint/build) y colector; aún no se ejecutó en GitHub porque los cambios no se han publicado.

## Entorno

- Windows 11 Pro, 13.9 GB de RAM visible (16 GB nominales).
- Java 21.0.7 (Temurin).
- Node 24.11.1, npm 11.6.2.
- Maven Wrapper en backend y colector.
- Docker Desktop instalado; engine 29.9.2. PostgreSQL 17.11 corre en el contenedor `betpulse-postgres` (puerto `5432`, healthcheck `healthy`).
- Dota 2: `C:\Program Files (x86)\Steam\steamapps\common\dota 2 beta`.
- Puerto `8080` ocupado por Jenkins; BetPulse backend usa `8081` en desarrollo.
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
- Lobby light-first, multi-juego y con datos reales; sin cuotas ni auth simuladas (ADR-019).
- Docker Desktop instalado para PostgreSQL en desarrollo; engine 29.9.2 y PostgreSQL 17.11 en contenedor (ADR-015).
- Identidad y wallet de M1 con sesión + CSRF, BCrypt 12, ledger SQL y triggers (ADR-020).
- Catálogo OpenDota en backend + SSE de lobby con salud de feed y frontend migrado (ADR-021).

## Hecho

- Definición del proyecto, justificación, objetivos, metodología, arquitectura y plan de seguridad (documento académico).
- Plan de desarrollo por hitos.
- Decisiones técnicas iniciales.
- Documentación base del repositorio: `AGENTS.md`, `README.md`, `docs/plan.md`, `docs/decisions.md`, `docs/architecture.md`, `docs/domain.md`, `docs/security.md`, `docs/demo.md`.
- Herramienta de captura GSI temporal en `scripts/gsi-capture/`.
- `.cfg` de GSI instalado en la carpeta de Dota 2.
- Backend base con Spring Boot 3.5.16, Flyway, PostgreSQL, Spring Security y `/api/health`.
- Frontend base con Next.js 15, React 19, Tailwind 4 e i18n ES/EN.
- Rediseño del lobby: `HomeLobby`, `SiteHeader`, `LiveTicker`, `FilterRail`, `MatchCard`, `BetSlip`, `LoginModal`, `MatchDetailModal`, `SiteFooter`, `GameSwitcher` y `Modal`.
- Catálogo frontend con OpenDota real (`catalog.ts`); fallback `Radiant`/`Dire` para partidas en vivo sin equipos nombrados.
- Selector multi-juego con Dota 2 activo y CS2/LoL/Valorant como “Pronto”.
- Hidratación corregida normalizando espacios de `Intl` en fechas y números.
- Componentes antiguos (`PulseLine`, `StatusPill`, `useBackendHealth`) eliminados.
- Verificación visual headless del lobby en 1440/1024/390, modal de login, modal de partido, tab de mercados y toggle ES/EN.
- Colector Javalin con `POST /gsi`, `GET /health` y persistencia local de payloads.
- `infra/docker-compose.yml` con PostgreSQL 17 y healthcheck; `infra/.env.example`.
- Backend reconfigurado a `8081`; `next.config.ts`, README y arquitectura actualizados.
- Docker Desktop instalado y PostgreSQL 17.11 levantado con `infra/docker-compose.yml` (contenedor `betpulse-postgres`, `healthy`).
- Smoke test completo frontend `3000` → proxy `/api/health` → backend `8081` → PostgreSQL.
- Migración V2 con identidad, wallet, ledger e idempotencia; triggers de invariantes y cuentas de sistema.
- Backend de identidad: registro, login, logout, `/me`, CSRF, sesión, roles y admin sembrado.
- Backend de wallet: saldo, depósitos/retiros demo, holds/releases, historial e idempotencia.
- Frontend de auth: `AuthProvider`, cliente API con CSRF, header autenticado y modal de login/registro real.
- Página `/wallet` con saldo, operaciones demo, montos rápidos, historial y estados de UI.
- Tests de integración con Testcontainers para auth, wallet/ledger e idempotencia.
- Backend de catálogo M2a: `OpenDotaClient`, `CatalogService`, `CatalogScheduler`, `CatalogController`, DTOs y salud del feed; tests unitarios y de controller.
- SSE de lobby: `LiveFeedService` y `LiveFeedController` con snapshot inicial, broadcast por evento de catálogo y heartbeat.
- Frontend M2a: fetch server-side al backend, hook `useLobbyFeed`, badge de feed ES/EN y datos en vivo sin recarga.
- CI básico en `.github/workflows/ci.yml` para backend, frontend y colector.

## Verificación

```powershell
cd backend
.\mvnw.cmd test

cd ..\frontend
npm run build
npm run lint

cd ..\collector
.\mvnw.cmd package
```

Resultados 2026-10-26:

- Backend: `.\mvnw.cmd verify` → 24/24 tests verdes (CatalogController 3, CatalogService 5, Auth 7, Wallet 8, Health 1).
- Frontend: `npm run build` y `npm run lint` verdes; rutas `/` y `/wallet` generadas.
- Flyway: V1 y V2 aplicadas sobre PostgreSQL 17.11; backend arranca y admin se siembra.
- Catálogo: `GET /api/catalog/lobby` directo y vía proxy devuelve 6 live + 8 recent con `feed.status=LIVE`.
- SSE: `GET /api/live/stream` vía proxy entrega snapshot inicial, 2 eventos `lobby` en 40 s y heartbeats cada 15 s; también verificado con `next start` (build de producción).
- UI E2E con Chrome headless: home 1440/390 con badge “Feed en vivo”, cards en vivo y sin overflow; sin errores de consola salvo el 401 esperado de `/api/auth/me` en estado anónimo.
- API vía proxy de Next.js: `GET /api/auth/csrf` → registro → `GET /api/wallet` → depósito → replay idempotente con el mismo `transactionId` y `replayed=true`.
- UI E2E de wallet: registro → depósito S/ 50 → retiro S/ 20 → saldo S/ 30 → recarga → logout → login.
- CI: workflow agregado; falta publicarlo para verlo verde en GitHub.

## Próxima acción

1. Publicar M1 + M2a (commit/push) para ejecutar el workflow de CI en GitHub.
2. Cuando sea posible, activar `-gamestateintegration`, espectar una partida y capturar payloads reales para cerrar M0 y crear fixtures.
3. M2b: contrato `/internal/ingest` con HMAC, `game_snapshots`/`game_events`, proyector de estado y SSE por partido, usando fixtures reales.
4. En paralelo, iniciar M3 por la parte pre-partida: mercados y motor de cuotas con datos de OpenDota, sin depender de GSI.
5. Actualizar este archivo al cerrar cada hito.

Referencia para levantar el entorno:

```powershell
docker compose -f infra/docker-compose.yml up -d postgres

cd backend
.\mvnw.cmd spring-boot:run

cd ..\frontend
npm run dev
```

El backend escucha en `http://localhost:8081`.

## Bloqueos

- Captura GSI real pendiente de que se active `-gamestateintegration` y se especte una partida; M2b no avanza sin fixtures.
- CI aún no se ejecutó en GitHub; los cambios están sin publicar.
- No hay mercados, cuotas, apuestas ni liquidación; los CTAs de apuesta siguen siendo UI y los mercados no se publican.

## Preguntas abiertas

- RAM/OS exactos de la laptop de presentación.
- Fuente principal de demo.
- ¿Segundo monitor para la demo?

## Cómo retomar en una sesión nueva

Pedir al agente:

> “Lee `AGENTS.md` y `docs/STATUS.md`; dime el estado actual y el próximo paso.”

No asumir el historial del chat. Actualizar este archivo al cerrar cada hito.
