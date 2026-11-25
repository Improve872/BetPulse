# BetPulse

Plataforma web de apuestas deportivas simuladas: Dota 2 en vivo y fútbol/NBA pre-partida. Datos reales, motor propio de cuotas, saldo en soles peruanos (PEN), liquidación y panel administrativo.

## Estado

El estado vigente (hito actual, bloqueos y próxima acción) está en [`docs/STATUS.md`](docs/STATUS.md). Los hitos cerrados, en [`docs/milestones/`](docs/milestones/).

## Stack

- Java 21 + Spring Boot 3 + Maven
- Next.js 15 + React 19 + TypeScript
- PostgreSQL + Flyway
- Colector GSI en Java
- SSE
- Docker para PostgreSQL en desarrollo

## Frontend actual

- Portada con header azul tinta, tres destacados fotográficos, filas por competición, buscador, rangos de fecha y boleto de 300 px.
- Dota 2, fútbol y NBA activos; CS2, League of Legends y VALORANT marcados como “Pronto”.
- Catálogo con datos reales de OpenDota (`/live` y `/proMatches`) servido por el backend; sin fixtures ni cuotas inventadas.
- Lobby actualizado por SSE (`/api/live/stream`) con eventos `lobby`, `markets` y `heartbeat`; badge de salud del feed y reconexión automática de `EventSource`.
- Login/registro real contra la API, con sesión, CSRF y header autenticado.
- Página `/wallet` con saldo disponible/retenido, recargas, retiros, historial e idempotencia.
- Cuatro mercados base por partida en vivo: ganador, total de kills, hándicap de kills y duración, más tres de eventos GSI (primera sangre, primera torre y siguiente Roshan), con cuotas propias a 3 decimales y versión.
- Deportes pre-partida: `/sports` para fútbol y `/nba` para NBA, con rail de competiciones, buscador, banner del próximo partido y `1X2`, total de goles, ganador NBA y total de puntos; cierre en el kickoff.
- Bet slip funcional con stake, payout potencial y retención de saldo; historial privado en `/bets`.
- Footer sobrio; el contexto de entorno local vive en la documentación, no en la interfaz.
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
- [`docs/milestones/`](docs/milestones/) — histórico de hitos cerrados.

## Requisitos

- Java 21
- Node.js 20+
- Docker Desktop (o PostgreSQL nativo)
- Dota 2 para la demo

## Docker (demo)

La demo completa de frontend + backend + PostgreSQL corre en contenedores:

```powershell
.\scripts\demo-package.ps1   # genera dist/betpulse-demo-kit
```

En la PC de la demo:

```powershell
cd C:\BetPulseDemo
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

Abre `http://localhost:3000`. Solo requiere Docker Desktop e internet para
OpenDota y ESPN. No incluye colector ni GSI. Detalle en `demo-kit/README.md`.

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

## Tests

```powershell
# Backend
cd backend
.\mvnw.cmd verify

# Frontend
cd frontend
npm run lint
npm test
npm run build

# E2E de dinero: levanta PostgreSQL, backend y frontend, y ejecuta Playwright
.\scripts\e2e.ps1
```

El E2E inyecta una partida GSI firmada, apuesta desde el navegador y espera la
liquidación real (`WON`) antes de comprobar el saldo.
