# Estado del proyecto

Última actualización: 2026-10-26

## Hito actual

M0 casi cerrado: Docker Desktop instalado, PostgreSQL 17 levantado y smoke test completo frontend → proxy → backend con base real verificado. Falta capturar GSI real y elegir fuente de demo. Base de M1 creada (esqueleto, Flyway V1, health); identidad y wallet aún no implementadas.

## Estado

- Documentación base completa.
- Backend Spring Boot 3.5.16 con endpoint `/api/health`; compila y su test pasa.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; build y lint verdes.
- Lobby rediseñado como casa de apuestas: header navy, acento naranja, ticker de partidas, filtros, cards, bet slip y modales. Responsive verificado en 1440, 1024 y 390 px.
- Datos reales de OpenDota (`/live` y `/proMatches`); sin fixtures ni cuotas inventadas. Los mercados muestran “Mercados no publicados”.
- Login/registro y “Mis apuestas” abren un modal UI; no hay autenticación simulada. El aviso de saldo ficticio queda en el footer.
- Colector Javalin 6.7.0; compila, `/health` y `/gsi` probados con payload de prueba.
- Backend movido a `8081` porque Jenkins ocupa `8080`; el proxy de Next.js apunta a `8081`.
- Smoke test completo verificado: frontend `3000` → `/api/health` → backend `8081` → PostgreSQL; respuesta `UP` y home `200`.
- PostgreSQL 17.11 en Docker (`betpulse-postgres`) con healthcheck; Flyway aplicó `V1__baseline.sql` y `app_metadata` existe.
- Backend arranca sin exclusiones de DataSource/JPA/Flyway; Hikari conecta y `/actuator/health` reporta `UP` con DB.
- GSI `.cfg` instalado en Dota 2; falta activar `-gamestateintegration` y capturar una partida real.
- No hay código backend de identidad, wallet, catálogo, cuotas, apuestas ni liquidación todavía; el catálogo actual es solo frontend contra OpenDota.

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

## Hecho

- Definición del proyecto, justificación, objetivos, metodología, arquitectura y plan de seguridad (documento académico).
- Plan de desarrollo por hitos.
- Decisiones técnicas iniciales.
- Documentación base del repositorio: `AGENTS.md`, `README.md`, `docs/plan.md`, `docs/decisions.md`, `docs/architecture.md`, `docs/domain.md`, `docs/security.md`, `docs/demo.md`.
- Herramienta de captura GSI temporal en `scripts/gsi-capture/`.
- `.cfg` de GSI instalado en la carpeta de Dota 2.
- Backend base con Spring Boot 3.5.16, Flyway, PostgreSQL, Spring Security y `/api/health`.
- Test `HealthControllerTest` verde.
- Frontend base con Next.js 15, React 19, Tailwind 4 e i18n ES/EN.
- Rediseño del lobby: `HomeLobby`, `SiteHeader`, `LiveTicker`, `FilterRail`, `MatchCard`, `BetSlip`, `LoginModal`, `MatchDetailModal`, `SiteFooter`, `GameSwitcher` y `Modal`.
- Catálogo frontend con OpenDota real (`catalog.ts`); fallback `Radiant`/`Dire` para partidas en vivo sin equipos nombrados.
- Selector multi-juego con Dota 2 activo y CS2/LoL/Valorant como “Pronto”.
- Hidratación corregida normalizando espacios de `Intl` en fechas y números.
- Componentes antiguos (`PulseLine`, `StatusPill`, `useBackendHealth`) eliminados.
- Verificación visual headless: lobby 1440/1024/390, modal de login, modal de partido, tab de mercados y toggle ES/EN.
- Colector Javalin con `POST /gsi`, `GET /health` y persistencia local de payloads.
- `infra/docker-compose.yml` con PostgreSQL 17 y healthcheck.
- `infra/.env.example`.
- `package-lock.json` del frontend generado.
- Backend reconfigurado a `8081`; `next.config.ts`, README y arquitectura actualizados.
- Smoke test parcial verificado: frontend `3000`, proxy `/api/health`, backend `8081`.
- Docker Desktop instalado y PostgreSQL 17.11 levantado con `infra/docker-compose.yml` (contenedor `betpulse-postgres`, `healthy`).
- Flyway aplicó `V1__baseline.sql` en PostgreSQL; tabla `app_metadata` con `schema_version = 1`.
- Backend arranca con DataSource/JPA/Flyway reales; Hikari conecta y `/actuator/health` responde `UP`.
- Smoke test completo verificado: home `3000` → proxy `/api/health` → backend `8081` → PostgreSQL.

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

Resultados 2026-10-25: `HealthControllerTest` 1/1, `npm run build` OK, `npm run lint` OK, `/api/health` 200 vía proxy. Tras el rediseño: build/lint verdes, ruta `/` dinámica, First Load JS 130 kB, sin errores de hidratación ni overflow horizontal en 1440/1024/390. Filtros (14/6/8/0), login modal y menú móvil probados con CDP; ES/EN sin placeholders.

Resultados 2026-10-26: `docker compose up -d postgres` OK; `betpulse-postgres` `healthy`; Flyway migró a v1; backend `Started BetPulseApplication` en 6 s; `/api/health` `UP`; `/actuator/health` `UP`; home `200` y proxy `/api/health` `200`.

## Próxima acción

1. En Steam, agregar `-gamestateintegration` a Dota 2 y espectar una partida real.
2. Ejecutar el colector y verificar que recibe payloads reales:

   ```powershell
   cd collector
   java -jar target\collector-0.1.0-SNAPSHOT.jar
   ```

3. Probar las 4 fuentes de demo, elegir fuente principal y respaldo, y guardar fixtures reales.
4. Cerrar M0 y actualizar este archivo.
5. Iniciar M1: identidad, sesiones, CSRF y wallet base. El esqueleto, Flyway y PostgreSQL ya están listos.

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

- Captura GSI real pendiente de que se active `-gamestateintegration` y se especte una partida.
- No hay backend de identidad, wallet, cuotas ni apuestas; los CTAs del lobby son UI y los mercados no se publican.

## Preguntas abiertas

- RAM/OS exactos de la laptop de presentación.
- Fuente principal de demo.
- ¿Segundo monitor para la demo?

## Cómo retomar en una sesión nueva

Pedir al agente:

> “Lee `AGENTS.md` y `docs/STATUS.md`; dime el estado actual y el próximo paso.”

No asumir el historial del chat. Actualizar este archivo al cerrar cada hito.
