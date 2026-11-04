# Plan de desarrollo — BetPulse MVP

## Enfoque

- Un solo desarrollador, una sola PC.
- Local-first: todo en `localhost`; sin LAN ni nube en la primera etapa.
- Vertical slices: DB → backend → frontend → prueba.
- Contract-first: OpenAPI, esquema de eventos GSI y mensajes SSE antes de codificar.
- Sin simulación en el producto; fixtures de payloads reales solo para tests.
- Hitos secuenciales, sin Scrum rígido. Cada hito termina en algo demostrable.
- La portabilidad a la laptop de presentación se resuelve al final.

## Hitos

### M0 — Spike y decisión de fuentes (3–5 días)

Objetivo: eliminar la incertidumbre antes de escribir el producto.

Tareas:

- Instalar Docker Desktop o decidir PostgreSQL nativo.
- Configurar GSI en Dota 2: `.cfg`, `-gamestateintegration`, modo espectador.
- Capturar payloads reales: draft, kills, torres, Roshan, fin de partida.
- Probar las 4 fuentes de demo:
  - DotaTV pro.
  - Partida de amigo.
  - Lobby local + espectador.
  - Replay GSI real.
- Medir: tiempo de setup, datos completos, latencia, estabilidad y posibilidad de mostrar liquidación.
- Elegir fuente principal y respaldo.
- Crear fixtures de payloads reales para tests.

Aceptación: payload GSI real recibido, datos completos de los 10 jugadores en espectador, fuente elegida y documentada.

### M1 — Esqueleto + identidad + wallet (2 semanas)

Objetivo: walking skeleton financiero.

Tareas:

- Repo, README, Docker Compose con PostgreSQL, CI básico.
- Spring Boot, Next.js y colector vacíos pero arrancando.
- Flyway: `users`, `roles`, `wallets`, `ledger_accounts`, `ledger_transactions`, `ledger_entries`, `idempotency_keys`.
- Auth: registro, login, logout, sesión, CSRF, roles; admin sembrado.
- Wallet: saldo, depósito demo, retiro demo, holds, ledger de doble entrada.
- UI: login/registro y página de billetera.
- Tests de ledger e idempotencia.

Aceptación: registro → recarga demo → saldo visible; ledger balanceado; cero saldos negativos en pruebas; CI verde.

### M2 — Ingesta GSI + OpenDota + SSE (2 semanas)

Objetivo: ver un partido real actualizándose en la web.

Tareas:

- Colector: recibe GSI, valida token, normaliza, batchea, spool en disco, HMAC al backend.
- Backend: `/internal/ingest`, `game_snapshots`, `game_events`, proyector de estado.
- Poller OpenDota: `/live`, partidos próximos, equipos, caché y backoff.
- SSE: estado del partido, marcador, eventos y salud del feed.
- UI: lista de partidos en vivo/próximos y página de partido con scoreboard.

Aceptación: evento GSI real se refleja en la UI; SSE reconecta; feed con lag se marca; lista OpenDota funciona.

### M3 — Mercados + motor de cuotas (2 semanas)

Objetivo: cuotas propias moviéndose con el partido.

Tareas:

- Modelo de mercados, selecciones, estados, versión y suspensión.
- Pre-partida: Elo desde OpenDota + margen.
- En vivo: regresión logística con oro, XP, kills, torres, racks, Roshan y tiempo.
- Historial de cuotas con features y versión del modelo.
- Reglas de suspensión: kill, torre, Roshan, pausa, lag.
- Admin: crear, suspender, reanudar y override manual con motivo.
- UI: mercados, cuotas y estado suspendido.

Aceptación: un kill mueve la cuota; versión incrementa; feed atrasado suspende; historial auditable.

### M4 — Apuestas + integración con wallet (2 semanas)

Objetivo: apostar de punta a punta.

Tareas:

- Bet slip y apuestas simples.
- Validación de mercado, `market_version`, cuota esperada, stake y límites.
- Hold de saldo, exposición y payout máximo.
- Idempotencia y prevención de apuestas duplicadas.
- Historial: abiertas, liquidadas y anuladas.
- Tests de concurrencia y doble apuesta.

Aceptación: apuesta aceptada, saldo retenido; cuota vieja rechazada; duplicado rechazado; nunca saldo negativo.

### M5 — Liquidación + admin + auditoría (2 semanas)

Objetivo: cerrar el ciclo del dinero.

Tareas:

- Reglas de settlement para mercados MVP.
- Trigger al terminar el partido; verificación con OpenDota.
- Exactly-once por apuesta; payout y actualización de wallet.
- Void/refund y estados de revisión.
- Admin: liquidaciones, apuestas, usuarios, exposición, salud y auditoría.
- UI de estados de liquidación.

Aceptación: partido termina → apuestas liquidadas una sola vez → wallet acreditada → auditoría completa; void funciona.

### M6 — Producto: arena visual, streaming y contenido (2 semanas)

**Estado:** cerrado 2026-11-04 (M6a + M6b + M6c + M6d).

Objetivo: consolidar la capa visual del producto y la jerarquía de información
del lobby, y después añadir streaming y contenido alrededor del partido.

#### M6a — Arena visual y sistema de diseño (1 semana)

- ADR-035: tema arena nocturna en lobby y `/match/[id]`; wallet, apuestas y
  admin siguen claros.
- Sistema visual: tokens, tipografía, contraste AA, foco, radios, sombras y
  movimiento.
- Partido destacado con datos reales: torneo, equipos, escudos, marcador,
  tiempo, formato y mercado principal.
- Cards con escudos, marcador y cuotas; odds tiles con hover, suspendido y
  estado “en tu boleto”.
- Navegación: tabs “En vivo / Resultados”; rail solo de torneos; header
  simplificado.
- Boleto vacío/activo y barra móvil.
- Escudos reales: `team_id` desde OpenDota, proxy cacheado
  `/api/catalog/teams/{id}/logo` y fallback a monograma.
- Movimiento de cuota sutil y respeto por `prefers-reduced-motion`.
- Estados de carga, error, vacío y reconexión.
- Detalle de partido oscuro.

Aceptación M6a:

- El primer viewport muestra partido destacado, tabs, lista y boleto.
- Ningún texto funcional menor a 11 px; contraste mínimo 4.5:1.
- Un solo CTA naranja por superficie; cero tabs/botones muertos.
- Escudos con fallback y sin layout shift.
- Responsive, `prefers-reduced-motion`, lint/build/tests verdes.
- Wallet, apuestas y admin sin regresiones.

#### M6b — Streaming, contenido y cierre de producto (1 semana)

- Streaming oficial Twitch/YouTube, administrable y con fallback offline:
  - `match_streams` con provider, canal/video, `label`, `enabled` y `fallback_url`.
  - Asignación por partida o liga; resolución partida > liga.
  - Admin `/admin/streams` con alta, edición, activación y borrado auditados.
  - Embed con `parent` de Twitch y iframe de YouTube; click-to-load sin autoplay.
  - CSP `frame-src` limitado a `player.twitch.tv` y YouTube.
  - Solo canales oficiales; nunca streams no oficiales.
- Player en `/match/[id]`, debajo del scoreboard; CTA “Ver stream” en hero,
  badge en cards y enlace en el modal. Sin iframe en el lobby.
- Copy ES/EN nuevo de la arena.
- “Próximos” queda preparado para M8; no se muestra hasta que exista data.
- UI de depósitos/retiros simulados y métodos genéricos.
- Detalle de partido con stream, timeline y mercados.
- Pulido final: home, live, partido, wallet, historial y admin.
- Responsive y legible en proyector.

Aceptación M6b: toggle ES/EN; soles bien formateados; stream carga o muestra
fallback; home con hero y contenido; flujo de pago demo; UI completa.

#### M6c — Copy de producto y saldo administrativo

- Quitar de la UI “saldo ficticio”, “partidas reales”, “proyecto académico” y chip DEMO.
- Footer global: solo copyright.
- Enlace **Admin** visible para `ROLE_ADMIN`.
- `/admin/users`: búsqueda por email/nombre y ajuste de saldo con motivo.
- Migración V11: `ADMIN_ADJUSTMENT` con ledger `USER_AVAILABLE` contra `HOUSE`
  y auditoría `WALLET_ADMIN_ADJUSTMENT`.
- Sin usuario demo fijo: el registro público crea la wallet.

Aceptación M6c: copy de producto sin avisos de demo; admin puede acreditar y
debitar saldo con ledger balanceado y auditoría; 100 tests backend verdes.

#### M6d — Cuenta, rail en vivo y checkout estándar

- `/account`: datos del usuario, resumen de wallet y cambio de contraseña.
- `POST /api/auth/password` con contraseña actual, política y sesión vigente.
- Menú de usuario en el header: cuenta, billetera, apuestas, admin y salir.
- `LiveRail`: carrusel horizontal de partidas en vivo con escudos, marcador,
  tiempo y cuotas del mercado principal.
- `/wallet` como checkout de pasarela en tres pasos (monto → pago → confirmar):
  - Tarjeta con vista previa, marca, formato, vencimiento, CVV y titular.
  - Yape/Plin con celular, OTP de 6 dígitos y reenvío.
  - Transferencia con banco, cuenta/CCI, referencia y número de operación.
  - Resumen, procesamiento y comprobante con nuevo saldo.
- Sin pasarela real ni envío de datos sensibles al backend; ledger sin cambios.
- Logos locales de métodos como indicadores, sin sellos de certificación.

Aceptación M6d: registro → cambio de contraseña → recarga con tarjeta/Yape/
transferencia → saldo actualizado; carrusel y menú funcionan en desktop y móvil;
101 tests backend verdes y lint/build verdes.

### M7 — Hardening + demo + empaquetado laptop (2 semanas)

Objetivo: que no falle en clase.

**Estado:** en curso. Empaquetado Docker listo para la demo del 2026-11-05.

Tareas:

- Headers, CSRF, rate limiting, RBAC, pruebas IDOR/XSS/CSRF.
- Tests de concurrencia, carga y E2E con Playwright.
- Escaneo de dependencias y checklist de seguridad.
- Documentación: OpenAPI, ERD, ADRs, runbook, manuales.
- Ensayo de demo 3 veces, guion y video de respaldo.
- Empaquetado Docker para la demo (frontend + backend + PostgreSQL):
  - Dockerfiles multietapa y `output: "standalone"`.
  - `infra/docker-compose.demo.yml` con healthchecks y volumen.
  - `demo-kit/` con arranque, parada, reset y `.tar` de imágenes.
  - Sin colector ni GSI en este paquete.

Aceptación: checklist aprobado; demo de 30 min sin fallos críticos; respaldo listo.

### M8 — Deportes pre-partida: fútbol y NBA (2–3 semanas)

Objetivo: ampliar contenido sin depender de ver el partido en vivo.

Se implementa **después de M6 y M7**. No incluye feed de eventos al segundo ni
apuestas en vivo para estos deportes.

Tareas:

- Catálogo multi-deporte con `sport`, ligas, equipos y fixtures.
- Fútbol primero:
  - Ligas: Premier League, La Liga, Bundesliga, Serie A y Ligue 1.
  - Fuente: ESPN (no oficial) y OpenLigaDB como respaldo de Bundesliga.
  - Caché, backoff y fallback; documentar que no hay SLA.
- Mercados de fútbol: `1X2` (local/empate/visitante) y `over/under` de goles.
- Motor de cuotas pre-partida con modelo transparente tipo Poisson/Elo.
- Liquidación con marcador final; empate posible; void si se postpona o abandona.
- NBA después:
  - Fuente: ESPN; balldontlie solo si hay API key.
  - Mercados: ganador y over/under de puntos.
  - Liquidación con overtime.
- UI: selector de deporte, página de liga, próximos partidos con countdown,
  equipos y forma reciente.
- Streaming solo si existe canal oficial embebible; si no, se omite.

Aceptación: fixtures de fútbol visibles con cuotas pre-partida; liquidación con
resultado final; NBA equivalente; el producto no afirma tener eventos en vivo
de fútbol/NBA.

## Programación referencial

El estado de avance vive solo en `docs/STATUS.md`. Aquí únicamente el calendario previsto.

| Fase | Semanas |
|---|---|
| M0 | S1 |
| M1 | S2–S3 |
| M2 | S4–S5 |
| M3 | S6–S7 |
| M4 | S8–S9 |
| M5 | S10–S11 |
| M6a | S12 |
| M6b | S13 |
| M7 | S14–S15 |
| M8 | S16–S18 |
| Buffer | S19 |

Las semanas son relativas porque la fecha de inicio está por definir. Con 16 GB de RAM y Docker solo para PostgreSQL, el desarrollo es viable.

## MVP mínimo

M0–M6 (arena visual + streaming) + admin. Si falta tiempo, recortar
secundarios de M8 antes que M7 (seguridad/demo).

## Definition of Done

- Código + tests + docs + CI verde + criterio de aceptación.
- Para wallet/betting/settlement: tests de concurrencia e idempotencia.
- Para APIs: OpenAPI actualizado.
- Para UI: estados de carga, error, vacío y reconexión; responsive; contraste AA;
  sin texto funcional menor a 11 px; `prefers-reduced-motion`.
- Actualizar `docs/STATUS.md` y, si cambió una decisión, `docs/decisions.md`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuente demo no disponible | Probar 4 fuentes en M0; principal + respaldo + video |
| GSI con delay o datos incompletos | Modo espectador, validación, suspensión, híbrido OpenDota |
| Red del aula aísla máquinas | No aplica en local-first; si se usa laptop, todo corre en ella |
| Docker pesado en 16 GB | Docker solo PostgreSQL; backend/frontend/colector nativos |
| OpenDota rate limit | Caché, backoff, API key |
| CDN de escudos o `/teams/{id}` caído | Proxy cacheado + fallback a monograma |
| Tema arena con contraste insuficiente | Tokens medidos y QA AA en navegador |
| Scope creep | MVP cerrado; parlays/cashout fuera |
| Concurrencia en wallet | Locks, constraints, tests de doble gasto |
| Tiempo | Buffer de 2 semanas; priorizar M0–M5 |

## Próximo paso

Ver `docs/STATUS.md` → "Próxima acción". No duplicar el estado aquí.
