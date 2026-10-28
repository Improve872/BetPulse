# BetPulse

Plataforma web de apuestas simuladas de esports, con Dota 2 como primer juego. Datos reales, motor propio de cuotas, wallet ficticia en soles peruanos (PEN), liquidación y panel administrativo.

> Proyecto académico. No opera con dinero real. El saldo es ficticio.

## Estado

M2a cerrado: catálogo OpenDota en backend con `GET /api/catalog/lobby`, SSE de lobby en `GET /api/live/stream` y frontend con badge de salud del feed. M1 sigue funcional (auth + wallet + tests). M0 queda abierto solo por la captura GSI real; M2b espera fixtures. Ver [`docs/STATUS.md`](docs/STATUS.md).

## Stack

- Java 21 + Spring Boot 3 + Maven
- Next.js 15 + React 19 + TypeScript
- PostgreSQL + Flyway
- Colector GSI en Java
- SSE
- Docker para PostgreSQL en desarrollo

## Frontend actual

- Lobby responsive tipo casa de apuestas: header navy, acento naranja, ticker de partidas, filtros, cards, bet slip y modales.
- Dota 2 activo; CS2, League of Legends y VALORANT marcados como “Pronto”.
- Catálogo con datos reales de OpenDota (`/live` y `/proMatches`) servido por el backend; sin fixtures ni cuotas inventadas.
- Lobby actualizado por SSE (`/api/live/stream`) con badge de salud del feed; reconexión automática de `EventSource`.
- Login/registro real contra la API, con sesión, CSRF y header autenticado.
- Página `/wallet` con saldo disponible/retenido, depósitos y retiros demo, historial e idempotencia.
- Los mercados muestran “Mercados no publicados” hasta conectar el motor de cuotas.
- Aviso de saldo ficticio en el footer y en la billetera; sin franja “DEMO”.
- Verificación: 1440, 1024 y 390 px; filtros, modales, ES/EN y flujo de billetera probados.

## Documentación

- [`AGENTS.md`](AGENTS.md) — reglas para agentes y desarrolladores.
- [`docs/STATUS.md`](docs/STATUS.md) — estado actual y próximo paso.
- [`docs/plan.md`](docs/plan.md) — hitos y alcance.
- [`docs/decisions.md`](docs/decisions.md) — decisiones de arquitectura.
- [`docs/architecture.md`](docs/architecture.md) — arquitectura, módulos y flujos.
- [`docs/domain.md`](docs/domain.md) — dominio, mercados y reglas de liquidación.
- [`docs/security.md`](docs/security.md) — plan de seguridad.
- [`docs/demo.md`](docs/demo.md) — guion y pruebas de demo.

## Requisitos

- Java 21
- Node.js 20+
- Docker Desktop (o PostgreSQL nativo)
- Dota 2 para la demo

## Arranque

```bash
# PostgreSQL
docker compose -f infra/docker-compose.yml up -d postgres

# Backend (http://localhost:8081; el 8080 lo usa Jenkins)
cd backend && ./mvnw spring-boot:run

# Frontend (http://localhost:3000)
cd frontend && npm run dev

# Colector GSI (http://127.0.0.1:3001)
cd collector && ./mvnw package && java -jar target/collector-0.1.0-SNAPSHOT.jar
```

OpenDota funciona sin API key; `OPENDOTA_API_KEY` es opcional para subir el rate limit. El frontend usa `BACKEND_URL` (por defecto `http://127.0.0.1:8081`) para el fetch server-side del catálogo.

## Próximo paso

M2b cuando existan payloads GSI reales: `/internal/ingest`, snapshots/eventos y proyector. En paralelo se puede iniciar M3 (mercados y cuotas pre-partida) con el catálogo OpenDota. Antes: publicar M1 + M2a para ejecutar CI. Ver [`docs/STATUS.md`](docs/STATUS.md).
