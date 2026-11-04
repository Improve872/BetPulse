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

**Actualización (2026-11-04):** ADR-037 retira de la UI el badge “Modo demo” y el término “saldo ficticio”. El ledger y la moneda de práctica se mantienen.

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

**Actualización (2026-11-03):** ADR-035 sustituye el lobby light-first y la ausencia de chip DEMO para las rutas de arena. Wallet, apuestas y admin conservan superficies claras.

**Actualización (2026-11-04):** ADR-037 elimina el aviso legal de saldo ficticio del footer y de la billetera; el footer queda solo con el copyright.

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


## ADR-027 - Feed competitivo sin GSI y resolucion de resultados

**Estado:** aceptada (2026-11-01)

**Contexto:** la demo necesita partidas de torneo con cuotas que fluctuen sin abrir Dota 2 ni espectar. GSI solo emite mientras se especta. OpenDota `/live` entrega hasta 100 partidas con `league_id`, marcador, tiempo, ventaja de oro y `building_state`, pero no trae el nombre de la liga ni eventos. OpenDota `/matches/{id}` entrega el resultado final, `first_blood_time`, `picks_bans` y `objectives` con tiempos exactos.

**Decision:**

- Las partidas con `league_id > 0` de `/live` se priorizan sobre las ranked en el lobby y muestran el nombre de liga resuelto con `/leagues/{id}` (cache de 6 h, negativo de 10 min).
- Las cuotas se siguen calculando con marcador y tiempo reales; no se simula movimiento ni se inventan eventos.
- Cuando los mercados de un partido se cierran, se encola una fila `PENDING` en `match_results` y se consulta `/matches/{id}` con backoff (60 s base, tope 30 min, 20 intentos). Al obtener resultado se guarda `READY` con ganador, scores, duracion, `first_blood_time`, `league_id` y `objectives` como JSON.
- `match_results` es la entrada del settlement de M5: la liquidacion consume un resultado ya resuelto y no consulta la fuente.
- Steam `GetLiveLeagueGames` queda como enriquecimiento opcional (torres, Roshan, draft, net worth) cuando exista `STEAM_API_KEY`. Sin key, el sistema funciona con OpenDota.
- GSI/M2b queda diferido con los fixtures reales ya capturados.

**Consecuencias:** la demo no depende de que haya una partida en vivo ni de espectar; si no hay torneo, el lobby cae a ranked. Sin key de Steam no hay draft, torres ni Roshan en vivo. Las partidas locales o con bots no existen en OpenDota: si en el futuro se crean mercados para ellas, su resultado tendra que venir de GSI y no de `match_results`.

## ADR-028 - Resultados por mercado y reglas de settlement (V6)

**Estado:** aceptada (2026-11-01)

**Contexto:** M5 necesita un resultado ya resuelto por mercado. Hasta V5 los mercados pasaban a `CLOSED` sin dejar ganador, y la liquidacion no tenia de donde partir.

**Decision:**

- `market_results` guarda un resultado por mercado (`market_id` unico): `outcome` (`SETTLED`/`VOID`), `winning_selection_key`, `resolver` (`MARKET_RESULT_V1`), `details` JSON y `resolved_at`.
- La resolucion solo consume `match_results` en estado `READY` o `VOID`; no consulta OpenDota ni GSI.
- Reglas: `MATCH_WINNER` usa `radiant_win`; `TOTAL_KILLS` compara kills totales con la linea; `KILL_HANDICAP` compara la diferencia final con la linea (RADIANT si `radiantKills - direKills > line`); `DURATION` compara minutos finales con la linea.
- Sin resultado valido, linea ausente o `match_results` en `VOID`, el mercado queda `VOID` sin ganador.
- El mercado resuelto pasa a `SETTLED` o `VOID` y no se reabre. La resolucion es idempotente: `ON CONFLICT (market_id) DO NOTHING`.
- Un scheduler cada 30 s resuelve mercados pendientes; se puede desactivar con `betpulse.markets.resolution-scheduler-enabled=false`.

**Consecuencias:** M5 ya tiene una entrada estable: apuestas sobre mercados `SETTLED`/`VOID` con ganador y detalles auditables. Queda para M5 el pago, el void de apuestas, la cola `NEEDS_REVIEW` y la administracion. Las apuestas existentes no se tocan todavia.

## ADR-029 - Mi partida: ingesta GSI, modos de fuente y practica (M2b)

**Estado:** aceptada (2026-11-01)

**Contexto:** apostar en la partida propia (espectando o con bots) es una funcionalidad del producto, no solo una fuente de demo. GSI solo emite mientras se juega o se especta, y en partidas con bots OpenDota no existe. El catálogo ya mezcla torneos y ranked de OpenDota.

**Decision:**

- El colector normaliza GSI a un contrato JSON versionado, deduplica eventos por `matchId:tipo:clock:playerIds`, envia snapshots a 1 Hz y reenvia eventos criticos de inmediato.
- El colector firma cada batch con HMAC-SHA256 (`X-BetPulse-Timestamp` + `X-BetPulse-Signature`) y guarda en spool los batches que el backend no acepta. El backend valida firma, ventana de 5 minutos e idempotencia (`snapshot_id`, `UNIQUE (match_id, event_id)`).
- V7 agrega `collector_sessions`, `game_snapshots`, `game_events` e `ingestion_health`. V8 agrega `markets.source` y `markets.practice`.
- El backend fusiona la partida GSI en el lobby con `source=GSI` y `playersScope=FULL|LOCAL`; si coincide un `match_id`, GSI gana y se elimina el duplicado de OpenDota. `POST_GAME` deja de ser `live`.
- Los mercados de una partida GSI se crean aunque el feed de OpenDota este caido o iniciando; una pausa suspende con `MATCH_PAUSED` y se reabre al despausar.
- `LOCAL` (bots) se marca `practice=true` y tiene stake maximo de S/ 100 via `betpulse.betting.practice-max-stake-cents`.
- Al recibir `POST_GAME` con `win_team`, se guarda `match_results` con `source=GSI` y los eventos como `objectives`. M5 liquida desde ahi; en partidas locales no hay verificacion OpenDota.
- La UI muestra una seccion "Mi partida" separada de torneos y ranked, con estado GSI, etiqueta de practica y pausa.

**Consecuencias:** la demo puede apostar en una partida propia sin depender de OpenDota ni de espectar un torneo. Los bots son controlables pero el resultado no es verificable externamente, por eso se etiquetan y limitan. Quedan para M2b completo: SSE por partido con timeline, mercados de primera sangre/primera torre/Roshan, suspension por eventos en el backend y extraccion de fixtures al repo (ya hecha).

## ADR-030 - Liquidacion exactly-once y anulacion administrativa (M5)

**Estado:** aceptada (2026-11-01)

**Contexto:** `market_results` ya deja un ganador o void por mercado. Faltaba convertir ese resultado en pagos sin duplicar movimientos ni permitir saldos negativos.

**Decision:**

- `settlements` tiene `bet_id` como clave primaria: una apuesta se liquida una sola vez. Si el insert no ocurre, no se mueve el wallet.
- `SettlementService` consume solo `market_results`; no consulta OpenDota ni GSI. Gana si `bet.selection_key = winning_selection_key`; pierde si no; `VOID` reembolsa el stake.
- Payout = `potential_payout_cents` calculado al apostar con la cuota aceptada.
- Asientos: gana `USER_HELD -stake`, `USER_AVAILABLE +payout`, `HOUSE -(payout-stake)`; pierde `USER_HELD -stake`, `HOUSE +stake`; void `USER_HELD -stake`, `USER_AVAILABLE +stake`. Suma cero por transaccion.
- `bets.status` pasa a `WON`/`LOST`/`VOID` y se agrega `bet_status_history`.
- `audit_logs` es append-only y registra `BET_SETTLED` y `BET_VOIDED` con actor cuando aplica.
- Admin puede anular apuestas `PLACED` o `NEEDS_REVIEW` con motivo obligatorio: reembolso, settlement `VOID` y auditoria. Endpoint `POST /api/admin/bets/{id}/void` con rol `ADMIN`.
- Un scheduler cada 5 s liquida pendientes; se desactiva con `betpulse.settlement.scheduler-enabled=false`.

**Consecuencias:** el ciclo del dinero queda cerrado: apuesta, hold, resultado, liquidacion, wallet y auditoria. La UI de apuestas muestra estado, pago y fecha de liquidacion; `/admin` permite revisar y anular. Quedan fuera de M5 los ajustes manuales de cuota y la conciliacion automatica de discrepancias GSI/OpenDota.

## ADR-031 - Mercados de eventos GSI (primera sangre, primera torre, siguiente Roshan)

**Estado:** aceptada (2026-11-01)

**Contexto:** con la partida propia ya ingerida, faltaban los mercados que dependen de eventos y no de marcador/tiempo. OpenDota no entrega esos eventos en vivo; GSI si.

**Decision:**

- Solo se crean para partidas GSI (`markets.source=GSI`).
- `FIRST_BLOOD`: se crea si el marcador sigue 0-0 y no existe evento `FIRST_BLOOD`.
- `FIRST_TOWER`: se crea si no existe evento `TOWER_KILL`.
- `NEXT_ROSHAN`: se crea solo si el snapshot trae Roshan (`playersScope=FULL`); en bots no existe.
- Cuotas fijas 50/50 con el margen del 6% (`1.887`), como linea base transparente. No se simula movimiento.
- El mercado se cierra cuando llega el evento correspondiente. `NEXT_ROSHAN` solo considera eventos posteriores a `markets.opened_at`.
- Al recibir `POST_GAME`, `match_results.objectives` se construye desde **todos** los `game_events` de la partida, no desde el payload final (que solo trae eventos recientes).
- El resolver entiende el formato GSI (`FIRST_BLOOD`, `TOWER_KILL`, `ROSHAN_KILL`) y el de OpenDota (`CHAT_MESSAGE_FIRSTBLOOD`, `building_kill`, `CHAT_MESSAGE_ROSHAN_KILL`), por si se habilitan en el feed pro.
- Si no hay evento, el mercado queda `VOID` al liquidar.

**Consecuencias:** se puede apostar a primera sangre, primera torre y siguiente Roshan en la partida propia. Las cuotas no pretenden precision; son un baseline. Quedan pendientes la suspension inmediata por kill/torre/Roshan (hoy solo pausa) y el SSE por partido con timeline.

## ADR-032 - SSE por partido, suspension por eventos y cierre con gracia

**Estado:** aceptada (2026-11-01)

**Contexto:** la partida propia necesitaba una vista con timeline en vivo, suspender mercados ante kills/torres/Roshan y no cerrar mercados por una desaparicion transitoria del feed.

**Decision:**

- `GET /api/matches/{id}` devuelve `match`, `events`, `players`, `buildings` y `roshan`. `GET /api/matches/{id}/stream` emite SSE `match` en cada snapshot y `heartbeat` cada 15 s.
- La vista `/match/[id]` consume el SSE, muestra marcador, net worth por equipo, tabla de jugadores, timeline y estado de Roshan. Las apuestas siguen en el lobby.
- Los eventos criticos (`FIRST_BLOOD`, `HERO_KILL`, `TOWER_KILL`, `ROSHAN_KILL`) suspenden los mercados 3 s con `EVENT_SUSPENSION`; una pausa usa `MATCH_PAUSED` y tiene prioridad.
- Al desaparecer una partida del feed, sus mercados se cierran tras `betpulse.markets.close-grace` (120 s por defecto) en vez de inmediatamente. Si reaparece antes, no se cierra.

**Consecuencias:** la partida propia tiene seguimiento en vivo sin recargar, los mercados se protegen ante eventos y un corte breve del feed no cierra mercados validos. Queda pendiente el panel admin de mercados y M3c.

## ADR-033 - Panel admin de mercados

**Estado:** aceptada (2026-11-01)

**Contexto:** faltaba control administrativo sobre mercados y cuotas: suspender, reanudar y corregir una cuota con motivo y auditoria.

**Decision:**

- `GET /api/admin/markets` lista mercados `OPEN`/`SUSPENDED`.
- `POST /api/admin/markets/{id}/suspend` exige motivo, deja el mercado `SUSPENDED` y audita `MARKET_SUSPENDED`.
- `POST /api/admin/markets/{id}/resume` vuelve a `OPEN`, limpia la suspension y audita `MARKET_RESUMED`.
- `POST /api/admin/markets/{id}/override` cambia la cuota de una seleccion (minimo 1.001), sube `markets.version` e inserta `odds_history` con `source=ADMIN_OVERRIDE`; audita `MARKET_OVERRIDE` con cuota, version previa y motivo.
- Solo se admiten cambios en mercados `OPEN`/`SUSPENDED`; un mercado `CLOSED`/`SETTLED`/`VOID` no se toca.
- Todos los endpoints requieren `ROLE_ADMIN` y escriben en `audit_logs`.
- UI: `/admin/markets` lista mercados, muestra selecciones y permite suspender, reanudar o cambiar cuota con prompts simples.

**Consecuencias:** la operacion puede corregir una cuota o detener un mercado sin tocar la base; cada accion queda auditada y versionada. La UI es funcional, no pulida; el bet slip sigue validando `marketVersion` y `expectedOdds` en el servidor.

## ADR-034 - Streaming oficial y deportes pre-partida (M6/M8)

**Estado:** aceptada (2026-11-01)

**Contexto:** la UI funciona pero se siente vacia: falta video, jerarquia y contenido alrededor del partido. Ademas se quiere ampliar a futbol y NBA sin depender de ver un partido en vivo durante la demo.

**Decision:**

- Streaming solo con embeds oficiales de Twitch y YouTube. Nada de streams no oficiales ni scraping.
- Twitch requiere `parent` con el dominio que embebe (`localhost` en desarrollo); YouTube usa iframe oficial. Ambos se configuran por partido o torneo desde admin.
- Se planea `match_streams` con `provider`, `channel_or_video`, `enabled` y `fallback_url`. CSP `frame-src` limitado a `player.twitch.tv` y YouTube. Si el embed falla, se muestra fallback.
- M6 agrega streaming, hero de partido destacado, “en vivo ahora”, badges/escudos, movimiento de cuota y estados de carga/vacio/error. “Proximos” queda preparado. La capa visual se concreta en ADR-035 (M6a); streaming y contenido quedan en M6b.
- Los deportes nuevos se implementan **despues de M6 y M7**, como M8, y solo **pre-partida**:
  - Futbol primero (Premier League, La Liga, Bundesliga, Serie A, Ligue 1).
  - Fuente: ESPN (no oficial, sin key) y OpenLigaDB para Bundesliga; cache, backoff y fallback.
  - Mercados: `1X2` y `over/under` de goles; liquidacion con marcador final, empate posible, void si se postpona.
  - NBA despues: ganador y `over/under` de puntos, liquidacion con overtime.
  - Sin feed de eventos al segundo ni apuestas en vivo para futbol/NBA.
- ESPN no ofrece SLA ni contrato: se documenta el riesgo y se usa solo como fuente de demo con cache.

**Consecuencias:** la web gana video y contenido sin comprometer derechos de transmision; los deportes nuevos llenan “Proximos” y la pagina de liga sin exigir GSI. A cambio, M8 amplia el alcance y exige actualizar AGENTS.md, plan.md y el modelo de datos. El calendario futuro de Dota (M3c) sigue sin resolverse. La ubicación concreta del player se define en ADR-036.

## ADR-035 — Arena visual y sistema de diseño del lobby (M6a)

**Estado:** aceptada (2026-11-03)
**Sustituye parcialmente:** ADR-019 (lobby light-first y sin chip DEMO).

**Contexto:** el lobby era funcional pero se percibía como un panel administrativo: tres columnas, cards uniformes, etiquetas de 9–10 px y ningún protagonista visual. La prioridad de M6a fue consolidar una capa visual propia sin inventar partidas, cuotas ni mercados.

**Decisión:**

- El lobby y `/match/[id]` usan el tema **arena nocturna**; wallet, apuestas y admin conservan el tema claro.
- Paleta: `arena #070d18`, `arena-soft #0b1220`, `arena-surface #0f1a2c`, `arena-raised #142136`, `arena-line #223149`, texto `#f8fafc` y muted `#94a3b8`. El naranja `#f97316` se reserva para lo vivo y la acción principal; `#c2410c` queda para texto sobre fondos claros.
- Header con chip **DEMO** visible, navegación “Arena” y “Mis apuestas”.
- El primer bloque del lobby es una **partida destacada** con torneo, equipos, escudos, marcador, tiempo y mercado principal. Solo se muestra si hay una partida en vivo; no se inventa mapa ni contenido.
- Tabs **En vivo / Resultados**; se retiran de la UI “Todos” y “Próximos”. El rail queda solo para torneos.
- Cards con escudos, marcador grande, cuotas tipo price tile y estado “en tu boleto”. El boleto vacío es discreto; con selección pasa a ser el bloque principal.
- Escudos reales: OpenDota `/live` y `/proMatches` entregan `team_id`; el backend expone `GET /api/catalog/teams/{teamId}/logo`, resuelve `/teams/{id}` con caché en memoria y redirige al CDN. Si falla o no hay equipo, la UI cae a monograma.
- Movimiento de cuota sutil cuando el precio cambia de verdad; respeta `prefers-reduced-motion`. Sin hero con imágenes de héroes, neón ni dark mode completo del admin.
- Sin cambios en el modelo de datos, cuotas, settlement, wallet ni reglas de apuesta.

**Consecuencias:**

- ADR-019 queda sustituida en lo relativo al lobby claro y a la ausencia de chip DEMO.
- El catálogo añade `teamId` a `LobbyTeam`; el endpoint de escudos depende de `cdn.steamusercontent.com` y debe fallar de forma silenciosa.
- La UI gana jerarquía y legibilidad; el coste es un tema oscuro específico de arena y un endpoint adicional de solo lectura.
- La página de partido y el modal oscuro comparten la misma identidad visual. Wallet/apuestas/admin no cambian de tema.

**Actualización (2026-11-04):** ADR-037 retira el chip DEMO del header. La arena mantiene el resto del sistema visual.

## ADR-036 — Streaming oficial en el detalle, no en el lobby (M6b)

**Estado:** aceptada (2026-11-03)

**Contexto:** M6b incorpora streams oficiales de Twitch/YouTube. El lobby ya tiene un partido destacado y un boleto; incrustar video allí cargaría iframes de terceros en la primera visita y competiría con la cuota.

**Decisión:**

- El reproductor vive en `/match/[id]`, debajo del scoreboard y en la columna principal. La página es el “match center”: stream, mercados, timeline, Roshan y jugadores.
- El lobby solo muestra un CTA **“Ver stream”** en la partida destacada, un badge **Stream** en las cards y un enlace en el modal de partido. No hay iframe en el lobby.
- El player es **click-to-load**: no se carga ningún iframe hasta que el usuario pulsa “Reproducir stream oficial”. Sin autoplay.
- `match_streams` permite asignar un stream a una **partida** o a una **liga** (exactamente uno), con `provider`, `channel_or_video`, `label`, `fallback_url` y `enabled`. La resolución prioriza partida > liga.
- El admin asigna streams desde `/admin/streams`; cada cambio se audita en `audit_logs` con acciones `STREAM_SAVED`, `STREAM_TOGGLED` y `STREAM_DELETED`.
- Twitch se construye con `player.twitch.tv` y `parent` del hostname actual; YouTube con `youtube.com/embed/{videoId}`. No se aceptan URLs arbitrarias de embed.
- CSP `frame-src` se limita a `'self'`, `player.twitch.tv`, `youtube.com` y `youtube-nocookie.com`.
- Si no hay stream, la partida GSI muestra “sin stream oficial” y el resto de la página sigue activo. Si el embed falla, se muestra `fallback_url`.
- Solo canales oficiales asignados por admin; nada de scraping ni retransmisiones no oficiales.

**Consecuencias:**

- El lobby sigue rápido y enfocado en descubrir/apostar; la página de partido es el lugar de “ver y apostar”.
- La configuración de streams requiere un admin y tarda hasta el siguiente refresco del catálogo (≤30 s) en reflejarse en el lobby.
- Si Twitch/YouTube bloquea el embed o el canal está offline, el fallback evita una caja negra sin salida.
- No se modifican cuotas, settlement, wallet ni reglas de apuesta.

## ADR-037 — Superficie de producto sin aviso demo y ajuste de saldo admin (M6c)

**Estado:** aceptada (2026-11-04)
**Sustituye parcialmente:** ADR-009 (badge “Modo demo”), ADR-019 (aviso legal en footer) y ADR-035 (chip DEMO en el header).

**Contexto:** el producto corre siempre en local y se usa como demostración de ingeniería y producto. Los avisos “saldo ficticio”, “proyecto académico” y el chip “DEMO” en la interfaz rompen la percepción de producto. Además, el admin no tenía forma de cargar saldo a un usuario, un flujo básico para la demo.

**Decisión:**

- La UI no muestra “saldo ficticio”, “partidas reales”, “proyecto académico” ni chip DEMO.
- El footer muestra solo `© 2026 BetPulse.`; no incluye Dota 2 ni avisos legales.
- El contexto de entorno local queda documentado en README/runbook, no en la interfaz.
- El registro es público; no se siembra un usuario demo con credenciales fijas.
- El admin puede ajustar el saldo de un usuario desde `/admin/users`: búsqueda por correo/nombre, saldo disponible/retenido, acreditar o debitar con motivo.
- El ajuste usa el ledger de doble entrada (`USER_AVAILABLE` contra `HOUSE`), tipo `ADMIN_ADJUSTMENT`, idempotencia por usuario y auditoría `WALLET_ADMIN_ADJUSTMENT`.
- El header muestra un enlace **Admin** solo cuando el usuario tiene rol `ADMIN`.

**Consecuencias:**

- AGENTS.md deja de exigir un aviso visible de demo; exige documentar el entorno local en README/runbook.
- Se agrega la migración V11 para permitir `ADMIN_ADJUSTMENT` en `ledger_transactions`.
- El admin puede preparar la demo sin tocar SQL manual; cada ajuste queda auditado y balanceado.
- No se crea un usuario demo fijo: el usuario se registra y puede recargar desde `/wallet` o recibir saldo del admin.
