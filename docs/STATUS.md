# Estado del proyecto

Última actualización: 2026-11-23

> Estado vigente únicamente. El histórico de hitos cerrados vive en `docs/milestones/`.

## Hito actual

**M7: hardening base cerrado. M8a cerrado: calendario de fútbol con ESPN. M8b cerrado: mercados 1X2 y total de goles con liquidación. M8c cerrado: NBA con ganador y total de puntos.** Siguiente: CI de M8 y opcionales (E2E de dinero). M3c sigue bloqueado por falta de calendario pre-partida.

Cerrados: M0 (capturas GSI reales), M1 (identidad y wallet), M2a (catálogo OpenDota + SSE), M2b (partida propia GSI), M3a y M3b (cuatro mercados en vivo con cuotas), M4 (apuestas simples con holds), M5 (liquidación, payout/void, admin y auditoría), M6a (arena visual y sistema de diseño), M6b (streaming oficial y cierre de producto), M6c (copy de producto y saldo administrativo), M6d (cuenta, rail en vivo y checkout simulado), M8b (fútbol pre-partida apostable), M8c (NBA pre-partida apostable). Detalle en `docs/milestones/`.

## Estado del sistema

- Backend Spring Boot 3.5.16 / Java 21 en `8081`; compila y arranca con PostgreSQL real.
- Frontend Next.js 15.5.28 + React 19.1 + Tailwind 4; lint y build verdes. Rutas `/`, `/account`, `/wallet`, `/bets`, `/sports`, `/admin`, `/admin/markets`, `/admin/streams`, `/admin/users` y `/match/[id]`.
- Lobby responsive con cards, filtros, modal de partida con mercados múltiples, bet slip y página de apuestas.
- M6a: lobby y `/match/[id]` usan el tema arena nocturna; wallet, apuestas y admin conservan superficies claras. Tabs En vivo/Resultados, partido destacado, escudos reales, cuotas tipo price tile, estado “en tu boleto” y boleto vacío discreto.
- Escudos: `LobbyTeam.teamId` desde OpenDota y proxy cacheado `GET /api/catalog/teams/{id}/logo`; fallback a monograma si el equipo o el CDN fallan.
- Movimiento de cuota sutil mediante SSE; respeta `prefers-reduced-motion`. Sin cambios en cuotas, settlement ni wallet.
- M6b: streaming oficial Twitch/YouTube con `match_streams` por partida o liga. `GET /api/catalog/lobby` expone `stream`; `/match/[id]` monta `StreamPlayer` click-to-load debajo del scoreboard; el lobby solo muestra CTA “Ver stream” y badges.
- Admin `/admin/streams` asigna provider/canal, activa/desactiva y elimina con auditoría. CSP `frame-src` limitado a Twitch/YouTube. Si no hay stream o el canal está offline, hay fallback sin inventar señal.
- M6c: la UI no muestra “saldo ficticio”, “partidas reales”, “proyecto académico” ni chip DEMO. Footer solo con copyright. El header muestra **Admin** al rol `ADMIN`.
- Admin `/admin/users` busca usuarios y acredita/debita saldo con motivo, ledger `ADMIN_ADJUSTMENT` y auditoría `WALLET_ADMIN_ADJUSTMENT`; el usuario se registra solo, sin cuenta demo fija.
- M6d: `/account` muestra nombre, correo, alta, rol, resumen de wallet y cambio de contraseña (`POST /api/auth/password`).
- M6d: el header autenticado agrupa cuenta, billetera, apuestas, admin y salir; en móvil son enlaces del menú. El saldo disponible aparece junto al usuario con un botón de ojo para ocultarlo; la preferencia persiste y el saldo se refresca al abrir la billetera, al apostar, al volver a la pestaña y cada 30 s.
- M6d: el lobby incorpora `LiveRail`, un carrusel horizontal de partidas en vivo (sin la destacada) con torneo, escudos, marcador, tiempo y cuotas del mercado principal.
- M6d: `/wallet` es un checkout de pasarela en tres pasos (monto → pago → confirmar). Tarjeta con vista previa, detección Visa/Mastercard/Amex, formato, vencimiento y CVV; Yape/Plin con celular y OTP de 6 dígitos; transferencia con banco, cuenta/CCI, referencia y número de operación. Incluye resumen, procesamiento y comprobante con nuevo saldo.
- M6d: los datos de tarjeta, OTP y cuentas viven solo en memoria del navegador; se enmascaran en la revisión y no se envían, registran ni guardan. El backend sigue recibiendo solo `amountCents` e `Idempotency-Key`.
- M6d: logos locales de Visa, Mastercard, Amex, Yape y Plin como indicadores de método; sin sellos de certificación ni afiliación.
- M7: backend y frontend tienen Dockerfiles multietapa; el frontend usa `output: "standalone"` y el backend corre sobre JRE 21 Alpine.
- M7: `infra/docker-compose.demo.yml` levanta PostgreSQL 17, backend y frontend; solo se publica el frontend en `3000` y el backend queda en la red interna.
- M7: `demo-kit/` incluye compose, `.env`, scripts de arranque/parada/reset y un `.tar` con las imágenes para cargarlas sin registro. `scripts/demo-package.ps1` genera el kit en `dist/`.
- M7: el empaquetado de demo no incluye colector ni GSI; el catálogo sigue viniendo de OpenDota y requiere internet.
- M7 (2026-11-16): corregido el checkout de tarjeta que bloqueó la demo. El vencimiento acepta `MM/AA` y `MM/AAAA`, tolera el mes de un dígito y no se compara contra el reloj (ADR-041). El CVV muestra su regla (3 dígitos, 4 en Amex).
- M7 (2026-11-16): Vitest añadido al frontend; `npm test` cubre `lib/checkout.ts` con 18 casos, incluida la regresión de fecha vencida. Entra al flujo de verificación y al CI junto a lint y build.
- `docs/demo.md` reescrito como guion técnico: arquitectura, cuatro flujos, invariantes de dinero, datos de demo válidos y preguntas del jurado.
- M7 (2026-11-16): rate limiting en memoria por ruta y método (`RateLimitFilter`, `RateLimitProperties`): login 10/min, registro 5/min, contraseña 5/min, apuestas 30/min, wallet 20/min, admin 60/min e ingesta 1200/min. Responde `429` con `Retry-After` (ADR-042).
- M7 (2026-11-16): CSP completa sin nonce y headers de seguridad (`nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`); `frame-src` queda limitado a Twitch y YouTube.
- M7 (2026-11-16): tests de control de acceso. Un `USER` recibe `403` en todos los paneles y acciones de admin; anónimo recibe `401`. El test destapó que `@PreAuthorize` devolvía `500` en lugar de `403` y que un parámetro con tipo inválido devolvía `500`; ambos casos se corrigen en `GlobalExceptionHandler`.
- M8a (2026-11-16): `/sports` muestra el calendario real de las cinco grandes ligas con datos de ESPN (`eng.1`, `esp.1`, `ger.1`, `ita.1`, `fra.1`), agrupado por liga, con escudos, sede y cuenta atrás. Solo se publican partidos programados: no hay cobertura ni apuestas en vivo de fútbol (ADR-043).
- M8a: `GET /api/sports/fixtures` público; caché en memoria con refresco cada 5 min, stale a los 20 min y horizonte de 10 días. Si una liga falla se conserva su última copia y el feed se marca `STALE`/`DOWN`.
- M8a: ESPN exige un `User-Agent` no-Java; se envía `BetPulse/0.1` y se documenta el `403` como riesgo. Escudos desde `a.espncdn.com` permitidos en `img-src`.
- M8b (2026-11-23): fútbol apostable. `MATCH_RESULT_1X2` (`HOME`/`DRAW`/`AWAY`) y `TOTAL_GOALS` por fixture, con `match_id=FB:<eventId>` y `markets.sport='SOCCER'`.
- M8b: cuotas Poisson desde la tabla real de ESPN (goles a favor/contra, suavizado y ventaja de local). Margen 6%, versión e `odds_history` con `POISSON_PREMATCH`. Sin tabla disponible, cuotas planas de liga; no se inventan fuerzas.
- M8b: los fixtures se consultan por mes (`dates=YYYYMM`) y se deduplican; el calendario cubre el horizonte de 10 días. `/sports` muestra cuotas y usa el boleto con equipos genéricos.
- M8b: los mercados se abren al publicarse y se cierran en el kickoff. El backend rechaza apuestas posteriores con `MATCH_STARTED` aunque el mercado siga `OPEN`.
- M8b: `sport_results` guarda el marcador final desde ESPN. `READY` liquida 1X2 (empate incluido) y total de goles; `VOID` por postponer/cancelar/abandonar o por 12 h sin resultado. El settlement no consulta ESPN.
- El lobby de Dota solo lista `markets.sport='DOTA'`; los mercados de fútbol no se mezclan. El cierre por desaparición del feed (`closeMissing`) también filtra Dota: verificado con una regresión que un cambio de catálogo no cierra mercados de fútbol.
- M8c (2026-11-23): NBA apostable. `MATCH_RESULT_2WAY` (`HOME`/`AWAY`, sin empate) y `TOTAL_POINTS` por partido, con `match_id=BB:<eventId>` y `markets.sport='BASKETBALL'`.
- M8c: modelo normal sobre la tabla real de ESPN (puntos a favor/contra por conferencia): `P(gana) = Φ(Δ/12)`, total con σ=18 y ventaja de local 2%. Sin tabla, media de liga y equipos neutros.
- M8c: `/sports` tiene selector Fútbol/NBA; el boleto es el mismo. El resultado final de ESPN incluye prórroga; un empate imposible anula el mercado.
- M8c: `PrematchMarketPublisher` y `PrematchResultService` se comparten entre fútbol y NBA; cada deporte solo aporta líneas, cuotas y etiquetas.
- M7 (2026-11-23): kit de demo regenerado con M8. `dist/betpulse-demo-kit` incluye V13, fútbol y NBA; `demo-kit/README.md` y `docs/demo.md` explican pre-partida, ESPN y el cierre en kickoff.
- Catálogo con datos reales de OpenDota; sin fixtures ni datos inventados en el producto.
- Las partidas con `league_id > 0` se priorizan sobre las ranked y muestran el nombre de liga resuelto con `/leagues/{id}` (caché 6 h).
- Cuatro mercados base por partida en vivo (ganador, total de kills, handicap y duración) más tres de eventos GSI (primera sangre, primera torre y siguiente Roshan), con versión e historial append-only.
- Apuestas con validación server-side, holds en el ledger, idempotencia y aislamiento por usuario.
- Auth real con sesión HttpOnly, CSRF y roles; wallet con ledger de doble entrada.
- Migraciones aplicadas: V1–V13.
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
- CI: ejecución verde `750bece` para backend (139 tests), colector, frontend (lint, test, build) e imágenes Docker.
  `https://github.com/Improve872/BetPulse/actions/runs/45306938270`
- CI: `frontend/package-lock.json` regenerado con npm 10 para que `npm ci` funcione en Node 22/Linux (faltaban `@emnapi/core` y `@emnapi/runtime`); sin cambios de versión.

## Próxima acción

1. M7 pendiente: E2E de flujos de dinero con Playwright (opcional tras la demo).
2. Opcional: M3c si aparece calendario fiable; Steam `GetLiveLeagueGames` si hay API key; pulido admin (usuarios, exposición, salud).
3. M8 cerrado; siguiente hito a definir en `docs/plan.md`.

## Pendiente de entorno (opcional)

- `STEAM_API_KEY` para enriquecer el feed pro con draft, torres y Roshan. No bloquea la demo.
- Demo kit `dist/betpulse-demo-kit` regenerado y probado en limpio (368 MB de imágenes); `start.ps1` carga el tar y deja PostgreSQL, backend y frontend `healthy`.

## Bloqueos

- OpenDota no ofrece calendario futuro fiable para M3c.
- Sin `STEAM_API_KEY` no hay draft, torres ni Roshan en vivo; el feed pro funciona con OpenDota.
- `npm audit`: 2 vulnerabilidades en dependencias de producción (PostCSS embebido en Next 15) y 6 en desarrollo (Vite/esbuild); sin críticas tras subir Vitest 5. Se resolverán con la actualización mayor de Next en M7.
- ESPN es una API no oficial y sin SLA; exige `User-Agent` propio. Si cambia el esquema o cae, el calendario de fútbol queda vacío o `STALE` sin afectar Dota.
- Las cuotas de fútbol dependen de la tabla de ESPN; sin ella se publican cuotas planas de liga. No hay cuotas de mercado reales para calibrar el modelo.

## Restricción de diseño vigente

El settlement es **agnóstico a la fuente**: consume `market_results` ya resuelto y no consulta OpenDota, GSI ni ESPN. OpenDota y GSI solo alimentan `match_results`; ESPN solo alimenta `sport_results`. Agregar una fuente nueva no toca el núcleo de pagos.

El **fútbol y la NBA son solo pre-partida**: los mercados se cierran en el kickoff y no hay cuotas ni cobertura en vivo. El lobby de Dota filtra `sport='DOTA'`; los catálogos no se mezclan.

La **arena** (lobby y detalle de partido) usa tema oscuro; **cuenta, wallet, apuestas y admin** usan tema claro. Los tokens de ambos entornos no se mezclan sin revisar contraste.

El **stream oficial** vive en `/match/[id]`, no en el lobby. El lobby solo muestra CTA “Ver stream”/badge; el iframe se carga con click-to-load y sin autoplay (ADR-036).

La UI no muestra avisos de demo ni “saldo ficticio”; el contexto local se documenta en README/runbook (ADR-037).

## Verificación

```powershell
cd backend
.\mvnw.cmd verify

cd ..\frontend
npm run lint
npm test
npm run build
```

Resultados 2026-11-23 (kit de demo):

- `dist/betpulse-demo-kit` regenerado con las imágenes de M8 (368 MB de `.tar`) y el README actualizado.
- Prueba en limpio en `3100` tras borrar imágenes y volumen: `start.ps1` cargó el tar y dejó los tres servicios `healthy`.
- Flyway aplicó V1–V13 sobre una base vacía; el único usuario es el admin sembrado.
- `/sports` respondió 200 con pestaña NBA; 60 fixtures de fútbol y 22 de NBA, todos con dos mercados y cuotas.
- Apuesta real por el proxy del frontend: registro → depósito S/ 200 → `1X2 HOME` @ 2.768 → `PLACED` con disponible S/ 190 y retenido S/ 10.
- `reset.ps1` dejó base limpia y volvió a levantar el stack; `stop.ps1` conserva datos.

Resultados 2026-11-23 (M8c):

- CI `750bece`: backend (139/139), colector, frontend (lint, 18/18 tests y build) e imágenes Docker en verde.
- Backend: 139/139 tests verdes (M8c suma el modelo normal, la resolución 2-way/total de puntos y el flujo NBA → resultado → settlement).
- Frontend: 18/18 tests de checkout; lint y build verdes.
- Flyway: V1–V13 aplicadas en Testcontainers y en el PostgreSQL local.
- Funcional con ESPN real: 21 partidos de NBA con 42 mercados abiertos; p. ej. Cavaliers vs Pacers con `HOME` @ 1.470 y total 220.5 (`OVER` 1.926 / `UNDER` 1.849).
- `/sports` renderizó el selector Fútbol/NBA y los datos de NBA desde el servidor.
- `/api/markets/live` siguió solo con mercados Dota (28); fútbol y NBA quedan fuera del lobby.
- La regresión de orden mantiene `HOME,DRAW,AWAY`, `HOME,AWAY`, y `OVER,UNDER` en las selecciones.

Resultados 2026-11-23 (M8b):

- Backend: 129/129 tests verdes (M8b suma el modelo Poisson, la resolución 1X2/total, la guarda de kickoff, el flujo fútbol → resultado → settlement y un test que verifica que el cierre por feed de Dota no toca mercados de fútbol).
- Frontend: 18/18 tests de checkout; lint y build verdes.
- Flyway: V1–V12 aplicadas en Testcontainers y en el PostgreSQL local.
- Funcional con ESPN real: 60 fixtures en 5 ligas y 120 mercados abiertos con cuotas y etiquetas de equipo; `/sports` renderizó cuotas desde el servidor. Los 120 mercados de fútbol siguieron `OPEN` tras 3 minutos de refrescos del catálogo de Dota.
- Flujo real por API: registro → depósito S/ 200.00 → apuesta S/ 10.00 a 1X2 `HOME` @ 2.768 → `PLACED`, disponible S/ 190.00 y retenido S/ 10.00.
- `/api/markets/live` siguió devolviendo solo mercados Dota (24), sin contaminación de fútbol.

Resultados 2026-11-16 (M7/M8a):

- Backend: 116/116 tests verdes (M7 suma rate limiting y control de acceso; M8a suma el mapeo de ESPN y la caché de fixtures).
- Frontend: 18/18 tests de checkout en Vitest; lint y build verdes.
- Regresión cubierta: `12/25` ya no bloquea la recarga; `12/2026` y `1/26` se aceptan.
- Headers verificados en `next start`: CSP completa, `nosniff`, `X-Frame-Options`, `Referrer-Policy` y `Permissions-Policy`.
- M8a verificado con backend real: `GET /api/sports/fixtures` devolvió 14 partidos en 5 ligas (`LIVE`), con escudos de `a.espncdn.com`; `/sports` renderizó título, fixture y escudo desde el servidor.
- Audit: sin vulnerabilidades críticas; quedan las de Next/PostCSS y las de desarrollo.

Resultados 2026-11-04 (M6d):

- Backend: 101/101 tests verdes (M6d suma el caso de cambio de contraseña en `AuthFlowTest`).
- Flyway: V1–V11 aplicadas en Testcontainers.
- Frontend: lint y build verdes; rutas `/`, `/account`, `/admin`, `/admin/markets`, `/admin/streams`, `/admin/users`, `/bets`, `/match/[id]` y `/wallet` generadas.
- Prueba de API real: registro → `me` con `createdAt` → cambio de contraseña → depósito S/ 150.00 → admin busca al usuario y acredita S/ 50.00 (saldo final S/ 200.00).
- QA de checkout con navegador automatizado local: recarga Yape con OTP, recarga con tarjeta Visa, recarga por transferencia, retiro por transferencia, errores de tarjeta/OTP y copy EN, a 1440 px y 390 px. Sin errores de consola.
- Verificación de red: los POST de depósito/retiro solo llevan `amountCents`; ningún dato de tarjeta, OTP o cuenta sale del navegador.
- M7 Docker: imágenes `betpulse-backend:demo` y `betpulse-frontend:demo` construidas; `docker compose up --wait` dejó PostgreSQL, backend y frontend `healthy`.
- M7 Docker: lobby con SSE a través del proxy de Next (6 partidas en vivo), registro, depósito, checkout con tarjeta, cuenta, apuesta, historial, admin y ajuste de saldo probados contra el stack en `3100`.
- M7 Docker: reinicio con `down`/`up` conservó usuario y saldo; `stop.ps1 -Volumes` + arranque dejó base limpia y admin sembrado.
- M7 Docker: kit de 365 MB generado en `dist/betpulse-demo-kit`; `start.ps1` cargó las imágenes desde el `.tar`, levantó el stack y respondió en `3101` sin instalar Java, Node ni PostgreSQL en el host.
- Colector: 11/11 tests verdes y `package` con shade correcto.
- E2E real (2026-11-01): GSI mid-game → 4 mercados base + torre/Roshan → apuesta de S/ 10 a ganador → `POST_GAME` → `WON` con payout S/ 10.96; wallet disponible S/ 100.96 y retenido S/ 0. Liquidación en menos de un minuto.

Verificación funcional anterior (2026-10-27): 24 mercados abiertos (4 por partida en 6 partidas en vivo); E2E registro → depósito S/ 100 → apuesta S/ 10 → `PLACED` con disponible S/ 90 y retenido S/ 10.

## Entorno

- Windows 11 Pro, 13.9 GB de RAM visible (16 GB nominales).
- Java 21.0.7 (Temurin); Node 24.11.1, npm 11.6.2.
- Maven Wrapper en backend y colector.
- Docker Desktop 29.9.2; imágenes `node:24-alpine`, `eclipse-temurin:21-jre-alpine` y `postgres:17-alpine` fijadas. PostgreSQL 17.11 local en `betpulse-postgres` (puerto `5432`).
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
