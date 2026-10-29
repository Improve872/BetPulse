# BetPulse — Agent Guide

## Start here

Leer **solo lo necesario**, en este orden:

1. `docs/STATUS.md` — siempre: hito actual, estado, bloqueos.
2. `docs/domain.md` — antes de tocar backend.
3. `docs/security.md` — antes de tocar auth, wallet, apuestas, settlement o admin.
4. `docs/architecture.md` — al crear, mover o revisar módulos.
5. `docs/decisions.md` — **no completo**: buscar el ADR relevante con grep.

`docs/plan.md` (alcance e hitos) y `docs/milestones/` (histórico) solo si hacen falta para la tarea.

No asumir el historial de conversaciones anteriores. El repositorio es la fuente de verdad.

## Proyecto

BetPulse es una plataforma web de apuestas deportivas simuladas contra la casa, con Dota 2 como primer juego. Consume datos reales, calcula cuotas propias, permite apuestas con saldo ficticio en soles peruanos (PEN), liquida resultados y ofrece panel administrativo.

No capta usuarios ni opera con dinero real. Es un proyecto académico y demostrativo.

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
- Aviso visible de "Modo demo / saldo ficticio".
- No solicitar datos reales de tarjetas ni procesar pagos reales.

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

## Stack

Java 21 + Spring Boot 3 + Maven · Next.js 15 + React 19 + TypeScript + Tailwind + shadcn/ui · PostgreSQL + Flyway · colector Java 21 + Javalin · SSE con `SseEmitter` · tests JUnit 5 + Testcontainers + Playwright. Monorepo. Detalle en `docs/decisions.md` (ADR-002 a ADR-006).

Backend por módulos: `identity`, `catalog`, `live`, `markets`, `odds`, `betting`, `wallet`, `settlement`, `payments`, `admin`, `audit`, `shared`.

## Comandos

Windows: usar `mvnw.cmd`.

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

## Flujo de trabajo

- Commits pequeños y frecuentes. **Nunca cerrar un hito con trabajo sin commitear.**
- Tests en módulos críticos: wallet, betting, settlement, odds.
- Ante una decisión nueva, documentarla en `docs/decisions.md` antes de implementarla.
- Definition of Done: código + tests + docs + CI verde + criterio de aceptación.
- No avanzar al siguiente hito sin cerrar el anterior.
- Una sesión por hito. Al cerrar: tests verdes → commit → actualizar `docs/STATUS.md` (presente, sin histórico) → cerrar la sesión.

## Documentación

| Archivo | Contenido | Cuándo |
|---|---|---|
| `docs/STATUS.md` | Estado vigente, bloqueos, próxima acción | Siempre |
| `docs/plan.md` | Alcance e hitos | Al planificar |
| `docs/decisions.md` | ADR (contexto → decisión → consecuencias) | Bajo demanda |
| `docs/architecture.md` | Módulos, flujos, infraestructura | Al diseñar |
| `docs/domain.md` | Entidades e invariantes | Al tocar backend |
| `docs/security.md` | Auth, CSRF, dinero, auditoría | Al tocar dinero o admin |
| `docs/demo.md` | Guion de presentación | Al preparar la demo |
| `docs/milestones/` | Hitos cerrados | Solo histórico |
