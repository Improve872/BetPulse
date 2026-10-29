# BetPulse — Agent Guide

## Start here

Toda sesión nueva debe leer, en este orden:

1. `docs/STATUS.md` — estado actual, próximo paso y bloqueos.
2. `docs/plan.md` — hitos y alcance.
3. `docs/decisions.md` — decisiones tomadas y por qué.
4. `docs/architecture.md` y `docs/domain.md` antes de tocar backend.
5. `docs/security.md` antes de tocar auth, wallet, apuestas o admin.

No asumir el historial de conversaciones anteriores. El repositorio es la fuente de verdad.

## Proyecto

BetPulse es una plataforma web de apuestas deportivas simuladas contra la casa, con Dota 2 como primer juego. Consume datos reales, calcula cuotas propias, permite apuestas con saldo ficticio en soles peruanos (PEN), liquida resultados y ofrece panel administrativo.

No capta usuarios ni opera con dinero real. Es un proyecto académico y demostrativo.

## Contexto de desarrollo

- Un solo desarrollador.
- Una sola PC de desarrollo.
- Estrategia local-first: todo en `localhost`; sin LAN ni nube en la primera etapa.
- PC de desarrollo: Windows, 16 GB RAM, Dota 2 instalado.
- Docker: se instalará para PostgreSQL; si da problemas, PostgreSQL nativo.
- Presentación: laptop propia; se empaqueta al final.
- No se depende de una LAN ni de otra PC.

## Alcance del MVP

Incluye:

- Dota 2.
- Registro/login de usuarios y acceso admin.
- Catálogo de partidas en vivo y próximas.
- Fuente híbrida: GSI para el partido espectado; OpenDota para catálogo, partidos secundarios, pre-partida y verificación.
- Mercados: ganador de mapa, total de kills O/U, hándicap de kills, primera sangre, primera torre, siguiente Roshan y duración.
- Motor propio de cuotas con margen, suspensión, versionado e historial.
- Apuestas simples.
- Wallet con depósitos/retiros simulados.
- Ledger de doble entrada, holds, idempotencia y auditoría.
- Liquidación exactly-once.
- Historial de apuestas.
- Panel admin.
- SSE para actualizaciones en vivo.
- UI en español por defecto + selector ES/EN.
- Streaming oficial Twitch/YouTube embebido, opcional.
- Métodos de pago simulados.
- Despliegue local-first; Docker para la presentación en laptop.

No incluye:

- Dinero real, pasarela real, KYC/AML real.
- Parlays/combinadas ni cashout en el MVP.
- Otros juegos.
- Apps móviles nativas.
- Nube con alta disponibilidad.
- Exchange entre usuarios.
- Chat, foros o leaderboards.

## No negociables

- Dinero en céntimos (`BIGINT`), nunca `float` ni `double`.
- Cuotas solo en el servidor. El cliente envía `marketVersion` y `expectedOdds`; el servidor valida.
- Ledger de doble entrada; cada transacción suma cero.
- `CHECK (available_cents >= 0)` y `CHECK (held_cents >= 0)`.
- Idempotencia obligatoria en apuestas, depósitos y retiros.
- Una sola liquidación por apuesta (`UNIQUE (bet_id)`).
- Suspender mercados ante kill, torre, Roshan, pausa, lag o fin de partida.
- Auditar acciones administrativas y cambios de cuotas.
- No simulación en el producto. Para tests se usan fixtures de payloads reales de GSI.
- No implementar parlays/cashout sin actualizar el alcance.
- Aviso visible de “Modo demo / saldo ficticio”.
- No solicitar datos reales de tarjetas ni procesar pagos reales.

## Stack

- Backend: Java 21 + Spring Boot 3 + Maven.
- Frontend: Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/ui.
- DB: PostgreSQL + Flyway.
- Colector GSI: Java 21 + Javalin, JAR independiente.
- Tiempo real: SSE con `SseEmitter`.
- Auth: sesión + cookies HttpOnly + CSRF; roles USER, TRADER, ADMIN, AUDITOR.
- Infra dev: Docker solo para PostgreSQL; backend/frontend/colector nativos.
- Infra demo: Docker Compose o nativo portable en la laptop.
- Tests: JUnit 5 + Testcontainers + Playwright.
- Repo: monorepo.

## Estructura del repo

```text
betpulse/
  backend/
  collector/
  frontend/
  infra/
  docs/
  scripts/
  .github/
```

Backend por módulos:

`identity`, `catalog`, `live`, `markets`, `odds`, `betting`, `wallet`, `settlement`, `payments`, `admin`, `audit`, `shared`.

## Comandos previstos

Windows: usar `mvnw.cmd` si aplica.

```bash
# PostgreSQL
docker compose -f infra/docker-compose.yml up -d postgres

# Backend
cd backend && ./mvnw spring-boot:run

# Frontend
cd frontend && npm run dev

# Colector
cd collector && ./mvnw package && java -jar target/collector.jar

# Tests backend
cd backend && ./mvnw verify

# Tests frontend
cd frontend && npm run lint && npm run build
```

## Arquitectura

- Monolito modular en Java.
- Colector GSI separado porque debe correr en la máquina de Dota 2.
- PostgreSQL como fuente de verdad.
- SSE para feed unidireccional.
- Next.js hace proxy de `/api` al backend en desarrollo.
- Docker Compose para PostgreSQL en dev; empaquetado para laptop al final.
- Sin LAN ni nube en la primera etapa.

Ver `docs/architecture.md`.

## Invariantes de dominio

- `wallets.available_cents >= 0`, `wallets.held_cents >= 0`.
- `ledger_entries` suma cero por transacción.
- `bets` unique `(user_id, idempotency_key)`.
- `settlements` unique `bet_id`.
- `game_events` unique `(match_id, event_id)`.
- `odds_history` append-only.
- `audit_logs` append-only.
- Odds decimales con 3 decimales; probabilidad con 8 decimales.
- Payout = stake × odds, redondeado a céntimos.

Ver `docs/domain.md`.

## Flujo de trabajo

- Commits pequeños y frecuentes.
- Tests en módulos críticos: wallet, betting, settlement, odds.
- Actualizar `docs/STATUS.md` al terminar cada hito.
- Actualizar `docs/decisions.md` cuando cambie una decisión.
- Definition of Done: código + tests + docs + CI verde + criterio de aceptación.
- No avanzar al siguiente hito sin cerrar el anterior.
- Ante una decisión nueva, documentarla antes de implementarla.

## Estado actual

Ver `docs/STATUS.md`.

## Próximo paso

M3a, M3b y M4 cerrados funcionalmente (cuatro mercados en vivo + cuotas + apuestas con holds; CI pendiente); M1 y M2a funcionales; M0 pendiente solo por la captura GSI real. M2b está diferido hasta tener fixtures. M5 (liquidación), admin de mercados y M3c pendientes. Ver `docs/STATUS.md`.
