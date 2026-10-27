# Registro de decisiones

Formato: contexto → decisión → consecuencias. Actualizar cuando cambie una decisión.

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
