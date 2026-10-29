# Registro de decisiones

Formato: contexto → decisión → consecuencias. Actualizar cuando cambie una decisión.

## Índice

- **Infra:** 001 local-first · 014 colector separado · 015 Docker solo PostgreSQL · 016 sin LAN
- **Stack:** 002 Java + Spring Boot · 003 Next.js · 004 PostgreSQL + céntimos · 005 SSE · 013 monolito modular
- **Producto:** 007 fuente híbrida · 008 motor de cuotas · 009 PEN ficticio · 010 ES/EN · 011 streaming · 012 sin parlays · 019 lobby
- **Seguridad y datos:** 006 sesión + CSRF · 017 fixtures reales sin simulación
- **Entorno:** 018 backend en 8081
- **Hitos:** 020 M1 identidad/wallet · 021 M2a catálogo/SSE · 022 M3a mercado ganador · 023 M2b diferido · 024 M3b mercados · 025 M4 apuestas
- **Proceso:** 026 estado en `STATUS.md` y una sesión por hito

## ADR-001 — Local-first en una sola PC

**Estado:** aceptada (2026-10-25)

**Contexto:** el proyecto se desarrolla en una PC con 16 GB y se presentará en una laptop.

**Decisión:** desarrollar y ejecutar todo en `localhost`; sin LAN ni nube en la primera etapa.

**Consecuencias:** Docker solo para PostgreSQL; backend, frontend y colector nativos. La portabilidad se resuelve al final.

## ADR-002 — Java 21 + Spring Boot 3 + Maven

**Estado:** aceptada

**Contexto:** el desarrollador tiene mayor fortaleza en Java.

**Decisión:** backend en Java 21 con Spring Boot y Maven.

**Consecuencias:** monolito modular; JPA para CRUD y JdbcTemplate para consultas críticas de ledger.

## ADR-003 — Next.js + React + TypeScript

**Estado:** aceptada

**Contexto:** se requiere una UI tipo casa de apuestas, con i18n y actualizaciones en vivo.

**Decisión:** frontend en Next.js con TypeScript, Tailwind y shadcn/ui.

**Consecuencias:** Next.js hace proxy de `/api` al backend en desarrollo para evitar CORS y compartir cookies.

## ADR-004 — PostgreSQL + Flyway y dinero en céntimos

**Estado:** aceptada

**Contexto:** el dominio financiero exige exactitud y constraints.

**Decisión:** PostgreSQL; montos en `BIGINT` de céntimos; odds `NUMERIC(8,3)`; probabilidad `NUMERIC(9,8)`.

**Consecuencias:** nunca usar `float`/`double` para dinero. Migraciones solo con Flyway.

## ADR-005 — SSE para tiempo real

**Estado:** aceptada

**Contexto:** el feed de marcador, cuotas y apuestas es unidireccional.

**Decisión:** SSE con `SseEmitter`.

**Consecuencias:** reconexión simple y compatible con proxies. WebSocket solo si se añade chat/presencia.

## ADR-006 — Autenticación por sesión + CSRF

**Estado:** aceptada

**Contexto:** SPA con backend propio y panel admin.

**Decisión:** cookies HttpOnly + CSRF; roles USER, TRADER, ADMIN, AUDITOR.

**Consecuencias:** no guardar JWT en localStorage. Same-origin vía proxy.

## ADR-007 — Fuente híbrida GSI + OpenDota

**Estado:** aceptada

**Contexto:** GSI solo entrega datos del partido espectado; OpenDota no da eventos por segundo.

**Decisión:** GSI para el partido espectado; OpenDota para catálogo, partidos secundarios, pre-partida y verificación.

**Consecuencias:** cada mercado conoce fuente, delay y confianza; suspender si el feed se atrasa. El partido GSI es el principal de la demo.

## ADR-008 — Motor de cuotas propio

**Estado:** aceptada

**Contexto:** consumir cuotas de terceros no demuestra el nivel de ingeniería buscado.

**Decisión:** calcular probabilidades, margen y cuotas en el backend.

**Consecuencias:** modelo pre-partida (Elo) + en vivo (logística) + versionado + historial auditable. No se busca precisión comercial, sino consistencia y calibración.

## ADR-009 — PEN ficticio

**Estado:** aceptada

**Contexto:** el proyecto es académico y no debe operar con dinero real.

**Decisión:** saldo ficticio en soles peruanos, formato `S/`, badge “Modo demo”.

**Consecuencias:** ledger en céntimos; depósitos/retiros simulados; sin datos de tarjetas reales.

## ADR-010 — Español por defecto + ES/EN

**Estado:** aceptada

**Contexto:** presentación en Perú y deseo de un producto profesional.

**Decisión:** UI en español con selector de inglés.

**Consecuencias:** i18n desde el inicio; el admin puede quedar solo en español al principio.

## ADR-011 — Streaming oficial embebido

**Estado:** aceptada

**Contexto:** el streaming suma valor de producto.

**Decisión:** iframes de Twitch/YouTube administrados desde el admin.

**Consecuencias:** CSP `frame-src`, allowlist de dominios, fallback offline y sin re-transmisión.

## ADR-012 — Sin parlays/cashout en el MVP

**Estado:** aceptada

**Contexto:** combinadas y cashout multiplican la complejidad de liquidación y riesgo.

**Decisión:** dejarlos fuera del MVP y documentarlos como trabajo futuro.

**Consecuencias:** solo apuestas simples al inicio.

## ADR-013 — Monolito modular

**Estado:** aceptada

**Contexto:** un solo desarrollador y necesidad de consistencia transaccional.

**Decisión:** un backend con módulos por dominio.

**Consecuencias:** límites de paquetes y tests de arquitectura; extracción futura solo si hace falta.

## ADR-014 — Colector GSI separado

**Estado:** aceptada

**Contexto:** GSI envía datos a `localhost` en la máquina de Dota 2.

**Decisión:** JAR Java independiente que corre junto a Dota 2.

**Consecuencias:** contrato HTTP/JSON con el backend; spool local si el backend cae.

## ADR-015 — Docker para PostgreSQL, nativo para el resto

**Estado:** aceptada

**Contexto:** 16 GB de RAM y necesidad de iterar rápido.

**Decisión:** Docker solo para PostgreSQL en desarrollo; backend/frontend/colector nativos.

**Consecuencias:** menor consumo y arranque más rápido. Empaquetado completo para la laptop al final.

## ADR-016 — Sin LAN inicial ni dependencia de otra PC

**Estado:** aceptada

**Contexto:** el proyecto se desarrolla en la PC del desarrollador y se presentará en una laptop.

**Decisión:** no depender de una red de aula ni de otra máquina.

**Consecuencias:** toda la demo corre en una sola máquina. Si se requiere otra, se empaqueta y se prueba antes.

## ADR-017 — Fixtures reales, sin simulación en el producto

**Estado:** aceptada

**Contexto:** se necesita testear sin fingir que el producto está simulado.

**Decisión:** usar payloads reales capturados de GSI como fixtures de test; la demo usa datos reales.

**Consecuencias:** los tests son deterministas y el producto no contiene un modo simulado.

## ADR-018 — Backend de desarrollo en el puerto 8081

**Estado:** aceptada (2026-10-25)

**Contexto:** Jenkins ya ocupa el puerto `8080` en la PC de desarrollo.

**Decisión:** usar `8081` como puerto por defecto del backend en desarrollo, configurable con `SERVER_PORT`.

**Consecuencias:** el proxy de Next.js apunta a `http://127.0.0.1:8081`; en otra máquina se puede volver a `8080` sin cambiar código. El colector GSI sigue en `3001`.

## ADR-019 — Lobby visual light-first con datos reales

**Estado:** aceptada (2026-10-25)

**Contexto:** la primera home era editorial y no se leía como casa de apuestas; el usuario pidió una UI limpia, login arriba a la derecha y enfoque multi-juego.

**Decisión:** rediseñar el lobby con tema claro, header navy, acento naranja, ticker de partidas en vivo, filtros, cards, bet slip y modales. Dota 2 activo y CS2/LoL/Valorant como “Pronto”. Consumir OpenDota real; sin cuotas falsas. Sin franja “DEMO”: el aviso visible de saldo ficticio queda como línea legal discreta en el footer. Login/registro es UI, sin autenticación simulada.

**Consecuencias:** el frontend no inventa partidas ni cuotas; los mercados muestran “Mercados no publicados” hasta que exista motor. El login se conectará a identidad en M2. Esta decisión sustituye el badge “Modo demo” de ADR-009 por el aviso legal del footer, manteniendo el requisito de aviso visible.

**Actualización (2026-10-27):** ADR-022 implementó el M3a; las partidas en vivo ya publican el mercado `MATCH_WINNER` con cuotas propias. Se mantiene la regla de no inventar partidas ni cuotas.

## ADR-020 — Identidad y wallet base de M1

**Estado:** aceptada (2026-10-26)

**Contexto:** M1 necesita autenticación por sesión con CSRF y un ledger de doble entrada verificable antes de construir apuestas.

**Decisión:**

- Sesión con cookie `HttpOnly` y CSRF ligado a sesión; el SPA obtiene el token y el nombre del header en `GET /api/auth/csrf` y lo envía en `X-CSRF-TOKEN` (default de `HttpSessionCsrfTokenRepository`). Login, registro y logout también exigen CSRF.
- Contraseñas con BCrypt costo 12. Admin sembrado por configuración (`ADMIN_EMAIL`/`ADMIN_PASSWORD`), sin registro público de admin.
- Wallet y ledger con SQL explícito (`JdbcTemplate`), `SELECT ... FOR UPDATE` sobre el wallet e idempotencia en `idempotency_keys`.
- PostgreSQL garantiza invariantes con triggers: cada transacción suma cero, `ledger_entries` es append-only y `ledger_accounts.balance_cents` se actualiza desde los asientos.
- Cada usuario recibe wallet y cuentas `USER_AVAILABLE`/`USER_HELD` al registrarse.

**Consecuencias:** el saldo materializado del wallet se puede conciliar contra el ledger; depósitos y retiros repetidos con la misma `Idempotency-Key` devuelven la misma respuesta. El costo BCrypt 12 hace más lentos los tests de auth, aceptable para el volumen del proyecto. La sesión vive en memoria (`HttpSession`); al reiniciar el backend se cierran las sesiones, aceptable en local-first.

## ADR-021 — Catálogo OpenDota en backend + SSE de lobby (M2a)

**Estado:** aceptada (2026-10-26)

**Contexto:** el lobby consulta OpenDota directamente desde Next.js. M2 requiere una única fuente de catálogo, estado en vivo y un canal SSE, pero la captura GSI sigue pendiente.

**Decisión:**

- El backend es la única fuente del catálogo: poller de OpenDota (`/live`, `/proMatches`) con caché en memoria, timeout de 7 s, intervalo base de 30 s y backoff exponencial de 30 s a 5 min.
- La API pública es `GET /api/catalog/lobby`; devuelve el mismo contrato que consume el frontend (`live`, `recent`, `updatedAt`, `feed`).
- SSE público en `GET /api/live/stream`: evento `lobby` con el snapshot y `heartbeat` cada 15 s. Al conectar se envía el snapshot actual.
- La salud del feed (`STARTING`, `LIVE`, `DEGRADED`, `STALE`, `DOWN`) viaja en la respuesta y se muestra en la UI.
- Persistencia de snapshots/eventos, `/internal/ingest` con HMAC y proyector de estado quedan para M2b, cuando existan payloads GSI reales. El catálogo OpenDota no se persiste todavía.

**Consecuencias:** el frontend deja de llamar OpenDota; puede renderizar el lobby desde el backend y actualizarlo por SSE. Si OpenDota falla, se conserva el último snapshot y la UI marca el feed degradado o atrasado. La caché se pierde al reiniciar el backend y se reconstruye con el primer poll. El poller vive en `CatalogScheduler` y se puede desactivar con `betpulse.opendota.scheduler-enabled=false`; los tests de integración lo desactivan para no depender de la red.

## ADR-022 - Mercado ganador en vivo y motor de cuotas M3a

**Estado:** aceptada (2026-10-26)

**Contexto:** OpenDota `/proMatches` devuelve partidos terminados y `/live` no ofrece un calendario futuro; por eso el modelo pre-partida con Elo no tiene una fuente de partidos programados en M3. Para avanzar sin GSI y sin inventar datos, M3a empieza por cuotas en vivo calculadas con el marcador y el tiempo reales de OpenDota.

**Decisión:**

- Crear un mercado `MATCH_WINNER` (Ganador del mapa) por cada partida en vivo, con selecciones `RADIANT` y `DIRE`; se persiste en `markets`, `selections` y `odds_history` (V3).
- Probabilidad base: `z = 0.20 * (killsRadiant - killsDire) * (0.6 + 0.4 * progreso)`, con `progreso = clamp(gameTime / 2400, 0.15, 1)`; `P(Radiant) = 1 / (1 + e^-z)`. Se limita a `[0.08, 0.92]` para que ambas cuotas decimales sean mayores que 1.
- Cuota: `odds = 1 / (p * (1 + margen))`, margen inicial 6%, redondeada a 3 decimales; probabilidad a 8 decimales.
- La versión del mercado sube solo cuando cambia alguna cuota redondeada; cada cambio inserta filas en `odds_history` (append-only).
- El mercado se suspende con motivo `FEED_STALE` o `FEED_DOWN` cuando la salud del catálogo no es confiable; se reabre al recuperarse el feed. Si la partida deja de estar en vivo, el mercado pasa a `CLOSED`; todavía no hay liquidación (M5).
- API pública: `GET /api/markets/live`; SSE: evento `markets` en `GET /api/live/stream`. El frontend muestra cuotas y estado, pero el botón de apostar sigue deshabilitado hasta M4.

**Consecuencias:** M3a entrega cuotas propias, versionadas y auditables sobre datos reales sin depender de GSI. Quedan para M3b/M3c: modelo pre-partida con Elo cuando exista calendario, mercados de kills/duración/hándicap, features de oro/XP y regresión logística en vivo, y persistencia del catálogo. La fórmula es una línea base transparente, no una promesa de precisión.

## ADR-023 — M2b diferido hasta contar con payloads GSI reales

**Estado:** aceptada (2026-10-27)

**Contexto:** M2b necesita fixtures de GSI reales para implementar y probar la ingesta sin simular datos. La captura sigue pendiente y no debe bloquear el resto del desarrollo.

**Decisión:** dejar M0 abierto solo por la captura y M2b diferido hasta disponer de payloads reales. El desarrollo continúa con los hitos que puedan usar OpenDota: M3a quedó cerrado funcionalmente y el siguiente alcance se decide entre M3b y M4.

**Consecuencias:** no habrá ingesta GSI, snapshots ni SSE por partido hasta cerrar la captura. El catálogo y las cuotas en vivo dependen de OpenDota y el mercado GSI seguirá fuera de la demo hasta M2b. M2b no se considera cerrado y debe retomarse antes de la demo final.

## ADR-024 — Mercados M3b calculables con OpenDota

**Estado:** aceptada (2026-10-27)

**Contexto:** M2b sigue diferido. OpenDota `/live` entrega kills por equipo y tiempo de juego, pero no eventos como primera sangre, primera torre o siguiente Roshan. M3b debe aportar más mercados sin inventar datos.

**Decisión:**

- Publicar por partida en vivo cuatro mercados: `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP` y `DURATION`.
- Las líneas se fijan al crear el mercado y se guardan en `markets.line`; no cambian durante la vida del mercado.
- `TOTAL_KILLS`: línea basada en kills actuales más kills esperados al ritmo de 1.2 kills/min, redondeada a `.5`. Probabilidad de `OVER` por supervivencia de Poisson del kills restantes.
- `KILL_HANDICAP`: línea móvil solo en su creación, `diferencia actual + 0.5`; se publica como `RADIANT`/`DIRE`. Probabilidad normal sobre la diferencia final con desviación proporcional a la raíz del tiempo restante.
- `DURATION`: línea `max(40.5 min, minuto actual + 5.5)`, redondeada a `.5`. Probabilidad de `OVER` con supervivencia exponencial y media restante `max(5, 45 - minuto actual)`.
- Todos los mercados aplican el mismo margen del 6% y los límites de probabilidad `[0.08, 0.92]`.
- Un mercado `CLOSED`, `SETTLED` o `VOID` no se reabre. `TOTAL_KILLS` y `DURATION` se cierran cuando el resultado ya es determinista y todavía no hay apuestas que deban liquidarse.
- Primera sangre, primera torre y siguiente Roshan quedan para M2b/M5 porque requieren eventos GSI.

**Consecuencias:** M3b ofrece cuatro mercados en vivo con datos reales y fórmulas transparentes. Las cuotas no pretenden precisión comercial. Los mercados que dependen de eventos quedan fuera hasta que exista GSI.

## ADR-025 — Apuestas simples y holds en M4

**Estado:** aceptada (2026-10-27)

**Contexto:** M3a/M3b ya publican mercados versionados. M4 debe permitir apostar sin permitir doble gasto, cuotas obsoletas ni duplicados.

**Decisión:**

- Una apuesta simple referencia un mercado, una selección, stake, `marketVersion` y `expectedOdds`.
- El cliente envía `Idempotency-Key`; `bets` tiene `UNIQUE (user_id, idempotency_key)` y guarda un hash del request.
- El servidor valida mercado `OPEN`, versión, cuota esperada, selección, stake y payout máximo.
- El stake se retiene con el ledger existente (`USER_AVAILABLE` → `USER_HELD`) en la misma transacción que crea la apuesta.
- Límites iniciales: stake entre S/ 1.00 y S/ 1,000.00; payout potencial máximo S/ 10,000.00.
- La apuesta nace `PLACED` y guarda una fila inicial en `bet_status_history`. La liquidación queda para M5; M4 no acredita ganancias.
- API autenticada: `POST /api/bets`, `GET /api/bets` y `GET /api/bets/{id}`. El historial siempre filtra por el usuario de la sesión.

**Consecuencias:** el flujo monetario de apuesta queda cerrado hasta el hold. El replay idempotente devuelve la misma apuesta y no vuelve a retener saldo. Las apuestas quedan abiertas hasta M5.

## ADR-026 — Estado en `STATUS.md` y una sesión por hito

**Estado:** aceptada (2026-10-28)

**Contexto:** el proyecto se desarrolla con agentes que reciben `AGENTS.md` en cada turno y reenvían todo el historial de la conversación. Tener el estado repetido en `AGENTS.md`, `README.md`, `plan.md` y `STATUS.md` produjo ya descripciones divergentes del mismo hito. Un hilo largo degrada el contexto: el agente arrastra afirmaciones obsoletas que compiten con las vigentes.

**Decisión:**

- `docs/STATUS.md` es la única fuente de verdad del estado, escrita en presente: hito actual, estado del sistema, bloqueos, próxima acción.
- `AGENTS.md` solo contiene guardarraíles que deben sobrevivir a cada turno (proyecto, no negociables, invariantes, comandos, flujo) y punteros. No repite alcance, stack, arquitectura ni estado.
- El histórico de hitos cerrados vive en `docs/milestones/` y no se lee al inicio de una sesión.
- `docs/decisions.md` se consulta por ADR concreto, no completo.
- Una sesión de agente por hito. Al cerrar: tests verdes → commit → actualizar `STATUS.md` → cerrar la sesión.
- Un hito bloqueado por el entorno se documenta en una línea con su causa y lo que lo desbloquearía, sin entrar en "Próxima acción" salvo que sea accionable de inmediato.

**Consecuencias:** el arranque de una sesión cuesta un documento en lugar de seis. El estado no puede divergir porque solo existe en un sitio. Se pierde la comodidad del historial de chat, que se sustituye por `STATUS.md` y `docs/milestones/`. La disciplina de commit antes de cerrar pasa a ser parte de la Definition of Done.

