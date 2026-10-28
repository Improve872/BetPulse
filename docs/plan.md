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

### M6 — Producto: i18n, streaming, pagos y pulido (2 semanas)

Objetivo: que se vea como una casa de apuestas seria.

Tareas:

- i18n ES/EN con español por defecto.
- Formato `S/ 1,250.00`, aviso visible de saldo ficticio.
- Streaming oficial Twitch/YouTube, administrable y con fallback offline.
- UI de depósitos/retiros simulados y métodos genéricos.
- Pulido visual: home, live, pre-partida, partido, wallet, historial, admin.
- Responsive y legible en proyector.

Aceptación: toggle ES/EN; soles bien formateados; stream carga; flujo de pago demo; UI completa.

### M7 — Hardening + demo + empaquetado laptop (2 semanas)

Objetivo: que no falle en clase.

Tareas:

- Headers, CSRF, rate limiting, RBAC, pruebas IDOR/XSS/CSRF.
- Tests de concurrencia, carga y E2E con Playwright.
- Escaneo de dependencias y checklist de seguridad.
- Documentación: OpenAPI, ERD, ADRs, runbook, manuales.
- Ensayo de demo 3 veces, guion y video de respaldo.
- Empaquetado para la laptop de presentación (Docker Compose o nativo portable).

Aceptación: checklist aprobado; demo de 30 min sin fallos críticos; respaldo listo.

## Programación referencial

| Fase | Semanas | Estado |
|---|---|---|
| M0 | S1 | En curso (falta captura GSI) |
| M1 | S2–S3 | Cerrado funcionalmente (auth + wallet + tests) |
| M2 | S4–S5 | En curso (M2a catálogo/SSE listo; M2b GSI pendiente) |
| M3 | S6–S7 | Pendiente |
| M4 | S8–S9 | Pendiente |
| M5 | S10–S11 | Pendiente |
| M6 | S12–S13 | Pendiente |
| M7 | S14–S15 | Pendiente |
| Buffer | S16 | Pendiente |

Las semanas son relativas porque la fecha de inicio está por definir. Con 16 GB de RAM y Docker solo para PostgreSQL, el desarrollo es viable.

## MVP mínimo

M0–M5 + UI básica + admin. Si falta tiempo, recortar M6 (streaming/inglés/secundarios) antes que M7 (seguridad/demo).

## Definition of Done

- Código + tests + docs + CI verde + criterio de aceptación.
- Para wallet/betting/settlement: tests de concurrencia e idempotencia.
- Para APIs: OpenAPI actualizado.
- Para UI: estados de carga, error, vacío y responsive.
- Actualizar `docs/STATUS.md` y, si cambió una decisión, `docs/decisions.md`.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| Fuente demo no disponible | Probar 4 fuentes en M0; principal + respaldo + video |
| GSI con delay o datos incompletos | Modo espectador, validación, suspensión, híbrido OpenDota |
| Red del aula aísla máquinas | No aplica en local-first; si se usa laptop, todo corre en ella |
| Docker pesado en 16 GB | Docker solo PostgreSQL; backend/frontend/colector nativos |
| OpenDota rate limit | Caché, backoff, API key |
| Scope creep | MVP cerrado; parlays/cashout fuera |
| Concurrencia en wallet | Locks, constraints, tests de doble gasto |
| Tiempo | Buffer de 2 semanas; priorizar M0–M5 |

## Primer paso concreto

1. Publicar M1 + M2a para ejecutar CI.
2. Activar `-gamestateintegration` y capturar payloads GSI reales.
3. Probar las 4 fuentes y elegir principal/respaldo; crear fixtures reales.
4. Cerrar M0 y M2b (ingesta GSI, snapshots/eventos y SSE por partido); en paralelo iniciar M3 pre-partida con OpenDota.
