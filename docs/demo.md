# Demo — BetPulse

> Guion técnico para presentar el sistema, no solo la pantalla. Cada bloque
> tiene **qué se muestra**, **qué se dice** y **qué demuestra**.

## Objetivo

Mostrar en una sola laptop el ciclo completo del dinero:

```text
partida real de Dota 2 → datos GSI → mercado → cuota → apuesta → hold
→ resultado final → liquidación exactly-once → wallet → auditoría
```

Y el mismo ciclo, sin cobertura en vivo, para deportes pre-partida:

```text
calendario de fútbol/NBA → tabla real de ESPN → modelo → cuota → apuesta
→ resultado final de ESPN → la misma liquidación
```

Alrededor de ese núcleo: catálogo OpenDota, deportes pre-partida, streaming
oficial, checkout simulado y panel administrativo.

## La idea en cinco frases

1. BetPulse es una casa de apuestas **simulada**: el dinero es ficticio, pero
   la contabilidad es real y verificable.
2. Las cuotas las calcula **solo el servidor**; el navegador nunca decide un
   precio.
3. El saldo no es una columna que se edita: es la **suma de un ledger de doble
   entrada** que siempre cuadra en cero.
4. Cada apuesta se liquida **una sola vez**, aunque el proceso se reintente.
5. Todo lo que pasa con dinero queda en una **bitácora inmutable**.

## Arquitectura en 60 segundos

```text
Dota 2 (espectador o bots)
   │ GSI HTTP POST
   ▼
Colector Javalin ── HMAC ──► Spring Boot /internal/ingest
   │                              │
   │                              ├─► PostgreSQL (snapshots, eventos, ledger)
   │                              └─► SSE ──► Next.js (lobby / partido)
   │
OpenDota /live ◄── poller 30 s ───┤
OpenDota /matches/{id} ◄──────────┤
ESPN (fútbol/NBA) ◄── 2–5 min ────┘

Navegador ── REST + cookies ──► Next.js proxy ──► Spring Boot
```

| Pieza | Tecnología | Papel |
|---|---|---|
| Frontend | Next.js 15 + React 19 + Tailwind 4 | Lobby, partido, deportes, wallet, admin |
| Backend | Spring Boot 3.5 + Java 21 | Dominio, cuotas, ledger, liquidación |
| Colector | Java 21 + Javalin | Recibe GSI, normaliza, firma, reintenta |
| Base de datos | PostgreSQL 17 + Flyway | Ledger, apuestas, mercados, auditoría |
| Fuente externa | OpenDota | Catálogo y verificación de resultados |
| Fuente externa | ESPN | Calendario, tablas y resultados de fútbol/NBA |

**Módulos del backend:** `identity`, `catalog`, `live`, `markets`, `odds`,
`betting`, `wallet`, `settlement`, `payments`, `admin`, `audit`, `shared`.

Es un **monolito modular**: una sola transacción ACID puede mover ledger,
apuesta y liquidación sin coordinación distribuida. Para un solo desarrollador
y una demo local, eso es una ventaja, no una limitación.

## Los cinco flujos que hay que saber explicar

### 1. Del partido al lobby

- **GSI** (Game State Integration) es el mecanismo oficial de Dota 2: el juego
  hace `POST` a un endpoint local con el estado de la partida.
- El colector valida el token, **normaliza** el payload, **deduplica** eventos
  por `matchId:tipo:clock:playerIds`, envía snapshots a 1 Hz, firma con **HMAC**
  y guarda en **spool** si el backend está caído.
- El backend valida firma y ventana de 5 minutos, guarda `game_snapshots` y
  `game_events`, y fusiona la partida en el lobby con `source=GSI`.
- Además, un poller consulta **OpenDota `/live`** cada 30 s para partidas de
  torneo y ranked. Esas partidas tienen delay; sus mercados son más
  conservadores y se marcan como tales.
- El lobby se difunde por **SSE** (`/api/live/stream`): el cliente recibe
  `lobby`, `markets` y `heartbeat`. El `/_match/[id]` tiene su propio stream.

**Qué demuestra:** datos reales, dos fuentes con calidades distintas y una UI
que se actualiza sola sin polling del navegador.

### 2. De los datos a la cuota

- Cuota decimal con 3 decimales; probabilidad con 8.
- `odds = 1 / (p × (1 + margen))`, margen inicial 6%.
- Mercados base: `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP`, `DURATION`.
- Mercados de evento (solo GSI): `FIRST_BLOOD`, `FIRST_TOWER`, `NEXT_ROSHAN`,
  con cuotas 50/50 y el mismo margen.
- Cada cambio sube `markets.version` y agrega una fila a **`odds_history`**
  (append-only) con la fuente (`MODEL` o `ADMIN_OVERRIDE`).
- Suspensión automática: kill, torre, Roshan, pausa, lag o fin de partida.
  Los eventos críticos suspenden 3 s (`EVENT_SUSPENSION`); una pausa usa
  `MATCH_PAUSED`; `close-grace` de 120 s evita cerrar por una desaparición
  transitoria del feed.

**Qué demuestra:** el precio no se inventa en el cliente y toda variación es
auditable y versionada.

### 3. Del clic a la apuesta

El cliente envía:

```json
{
  "marketId": "uuid",
  "selectionId": "radiant",
  "stakeCents": 1000,
  "expectedOdds": 1.72,
  "marketVersion": 5,
  "idempotencyKey": "bet-..."
}
```

El servidor valida, en este orden:

1. sesión y usuario;
2. mercado abierto y no suspendido;
3. `marketVersion` vigente;
4. `expectedOdds` coincide con la cuota actual;
5. stake dentro de límites (en partidas de práctica, máximo S/ 100);
6. saldo disponible suficiente.

Si algo falla, **no se mueve dinero**. Si todo pasa, en una sola transacción:

- `USER_AVAILABLE -stake`, `USER_HELD +stake`;
- se crea `bets` en `PLACED` con snapshot de mercado, selección, versión y
  cuota aceptada;
- se registra `bet_status_history`.

La clave de idempotencia es `UNIQUE (user_id, idempotency_key)`: el doble clic
devuelve la misma apuesta, no crea dos.

**Qué demuestra:** consistencia bajo concurrencia y rechazo explícito de cuota
vieja.

### 4. Del final del partido al dinero

Este es el flujo que hay que explicar despacio, porque es el corazón del
sistema:

```text
partido termina
   → match_results      (resultado verificado: ganador, scores, duración, objetivos)
   → market_results     (cada mercado: SETTLED con selección | VOID)
   → settlements        (una fila por apuesta, unique bet_id)
   → ledger + wallets   (pago, pérdida o reembolso)
   → audit_logs         (append-only)
```

- `match_results` viene de GSI (`POST_GAME`) o de OpenDota `/matches/{id}`, con
  backoff e idempotencia.
- `market_results` resuelve **una sola vez** por mercado. Sin resultado válido
  → `VOID`.
- `settlements.bet_id` es clave única: aunque el scheduler corra dos veces, la
  apuesta se liquida una sola vez.
- El payout usa la **cuota aceptada**, no la cuota final:
  `round_half_up(stake_cents × odds)`.

**Qué demuestra:** el settlement es agnóstico a la fuente. Agregar un deporte
nuevo no toca el núcleo de pagos.

### 5. Deportes pre-partida: fútbol y NBA

- `/sports` (fútbol) y `/nba` consultan **ESPN** y publican solo partidos
  programados de las cinco grandes ligas y de la NBA. No hay cobertura en vivo.
- Dos mercados por partido:
  - Fútbol: `MATCH_RESULT_1X2` (local/empate/visitante) y `TOTAL_GOALS`.
  - NBA: `MATCH_RESULT_2WAY` (local/visitante, sin empate) y `TOTAL_POINTS`.
- Las cuotas salen de la **tabla real de ESPN**:
  - Fútbol: Poisson con goles esperados por ataque/defensa y ventaja de local.
  - NBA: normal sobre margen y total; la prórroga cuenta en el marcador final.
- El mercado se **cierra en el kickoff**. El backend rechaza cualquier apuesta
  posterior con `MATCH_STARTED` aunque el mercado siga `OPEN`.
- El resultado final llega de ESPN a **`sport_results`** (`READY`/`VOID`).
  `MarketResultService` y `SettlementService` no saben que existe ESPN.
- Si el partido se postpone/cancela o pasan 12 h sin resultado: `VOID` y
  reembolso.

**Qué demuestra:** el mismo motor de cuotas, apuestas y liquidación sirve para
un segundo y tercer deporte sin duplicar el núcleo de pagos.

## El dinero: cuentas y movimientos

Cuentas del ledger: `USER_AVAILABLE`, `USER_HELD`, `HOUSE`,
`HOUSE_REVENUE`, `PENDING_PAYOUT`, `EXTERNAL`.

| Operación | Movimiento |
|---|---|
| Depósito | `EXTERNAL` → `USER_AVAILABLE` |
| Apuesta | `USER_AVAILABLE` → `USER_HELD` |
| Apuesta ganada | `USER_HELD -stake`, `USER_AVAILABLE +payout`, `HOUSE -(payout - stake)` |
| Apuesta perdida | `USER_HELD -stake`, `HOUSE +stake` |
| Void | `USER_HELD -stake`, `USER_AVAILABLE +stake` |
| Retiro | `USER_AVAILABLE` → `EXTERNAL` |
| Ajuste admin | `USER_AVAILABLE` ↔ `HOUSE` |

Invariantes que la base de datos impone, no la aplicación:

- `wallets.available_cents >= 0` y `held_cents >= 0` (`CHECK`).
- Cada transacción del ledger **suma cero**.
- `bets` único por `(user_id, idempotency_key)`.
- `settlements` único por `bet_id`.
- `odds_history` y `audit_logs` son **append-only**.

**Frase para el jurado:** el saldo no se guarda como verdad; se deriva de
asientos que no pueden dejar de cuadrar.

## Seguridad y control

- Sesión con cookie **HttpOnly** y **CSRF**; roles `USER` / `ADMIN`.
- RBAC en admin: solo `ADMIN` suspende mercados, anula apuestas, ajusta saldo,
  asigna streams.
- Toda acción admin exige **motivo** y escribe en `audit_logs`.
- El checkout **no envía datos de tarjeta**: el backend recibe únicamente
  `amountCents` e `Idempotency-Key`. Tarjeta, OTP y CCI viven solo en memoria
  del navegador.
- CSP limita `frame-src` a Twitch y YouTube.
- El endpoint interno del colector exige **HMAC** y ventana de 5 minutos.

## Guion de 20 minutos

| Min | Pantalla | Qué decir | Qué demuestra |
|---|---|---|---|
| 0–2 | Lobby | "Dota 2 en vivo, cuotas propias, apuestas contra la casa, saldo en soles" | Producto y propuesta |
| 2–4 | Registro → `/account` | "Sesión HttpOnly, CSRF, roles; la cuenta se crea con wallet propia" | Identidad |
| 4–6 | Lobby | Tres destacados con foto y cuotas, filas por competición, buscador, cuotas que se mueven solas | OpenDota + SSE |
| 6–8 | `/match/[id]` | Marcador, timeline, mercados, stream oficial click-to-load | Ingesta y detalle |
| 8–11 | `/wallet` | Checkout en 3 pasos: monto → pago → confirmar; tarjeta/Yape/transferencia | Producto de pagos |
| 11–13 | `/wallet` comprobante | "El backend solo recibió monto y clave de idempotencia" | Privacidad de datos |
| 13–15 | Detalle | Abrir apuesta, ver hold y saldo retenido | Ledger en vivo |
| 15–17 | Dota 2 | Provocar primera sangre o torre; el mercado se cierra y versiona | Suspensión y motor de cuotas |
| 17–18 | Dota 2 | Terminar la partida con bots (`POST_GAME`) | Resultado real |
| 18–19 | `/bets` y wallet | Estado `WON/LOST/VOID`, payout, saldo actualizado | Liquidación exactly-once |
| 19–20 | `/admin` | Suspender, override con motivo, anular apuesta, ver auditoría | Control y trazabilidad |

### Segmento opcional: deportes pre-partida (2–3 min)

Se inserta entre `/wallet` y la partida de Dota, o al final si sobra tiempo.

1. Abrir la portada `/`: tres destacados fotográficos (NBA, fútbol y Dota en
   vivo), buscador y filas por competición. Mostrar que los destacados no se
   repiten en las filas.
2. Fútbol: entrar a `/sports`, mostrar el rail de competiciones, el banner del
   próximo partido y `1X2` + total de goles con cuotas del servidor. Mencionar
   que salen de la tabla real, no de una API de cuotas.
3. Elegir una selección; el boleto muestra equipos, mercado y cuota.
4. Apostar `S/ 10` con el usuario de demo y volver a `/bets` para ver `PLACED`
   y el hold; abrir el detalle de la apuesta en el panel derecho.
5. NBA: entrar a `/nba` y repetir con ganador o total de puntos; explicar que
   no hay empate.
6. Cerrar diciendo que la liquidación ocurre al terminar el partido y usa el
   mismo motor ya mostrado con Dota. **No hay que esperar** a que termine un
   partido para demostrar el dinero.

> Si en la corrida anterior quedó una apuesta pre-partida ya liquidada, sirve
> como evidencia real del pase ESPN → `sport_results` → `market_results` →
> `settlements`.

## Datos de demo (usar estos, no improvisar)

| Campo | Valor |
|---|---|
| Tarjeta | `4111 1111 1111 1111` |
| Titular | `ANA PEREZ` |
| Vencimiento | `12/29` (también acepta `12/2029`) |
| CVV | `123` |
| Yape/Plin | `987 654 321`, OTP `123456` |
| Transferencia | BCP, operación `12345678` |
| Monto | `150.00` |
| Apuesta pre-partida | Cualquier partido de `/sports` o `/nba`, stake `10.00` |

> El checkout acepta cualquier fecha con formato válido y mes entre 01 y 12;
> no compara contra el reloj para no bloquear la demo con tarjetas de ejemplo
> vencidas (ADR-041).

## Cómo explicar el sistema según el tiempo disponible

**30 segundos.** "Es una casa de apuestas con dinero simulado. Los datos vienen de GSI, OpenDota y ESPN; las cuotas se calculan en el servidor y el saldo vive en un ledger de doble entrada que garantiza que no se pierda ni se cree dinero."

**3 minutos.** Añadir el ciclo: partido → mercado → apuesta con hold →
resultado → `market_results` → `settlements` → pago → auditoría. Mencionar la
idempotencia y el unique por apuesta, y que el mismo ciclo funciona para
fútbol y NBA pre-partida.

**15 minutos.** Recorrer los cinco flujos de este documento en orden, con la
pantalla correspondiente, y cerrar con el panel admin y la auditoría.

## Preguntas probables del jurado

**¿Por qué dinero simulado?**
Porque operar con dinero real exige licencia, cumplimiento y pasarela. El
objetivo académico es demostrar el sistema de dinero, no captar apuestas.

**¿Cómo evitan que alguien apueste dos veces con doble clic?**
`Idempotency-Key` única por usuario y `UNIQUE (user_id, idempotency_key)` en la
base. El segundo request devuelve la misma apuesta.

**¿Qué pasa si la cuota cambia mientras el usuario apuesta?**
El cliente manda `marketVersion` y `expectedOdds`; el servidor compara contra
el estado actual y rechaza con la cuota nueva. Nunca se acepta a ciegas.

**¿Cómo garantizan una sola liquidación?**
`settlements.bet_id` es clave primaria y el proceso corre en una transacción.
Un reintento choca contra la restricción y no duplica el pago.

**¿Puede quedar saldo negativo?**
No: hay `CHECK` en la base y la operación de débito es condicional. El test de
concurrencia intenta doble gasto y falla como debe.

**¿De dónde salen las cuotas?**
De un modelo propio. En Dota: Elo pre-partida y regresión logística en vivo
sobre oro, XP, kills, torres, racks, Roshan y tiempo. En fútbol: Poisson con la
tabla real de ESPN. En NBA: normal sobre margen y total. Siempre con margen del
6%, versionadas y guardadas en `odds_history`.

**¿Por qué no hay apuestas en vivo de fútbol o NBA?**
Porque no hay feed de eventos al segundo. Prometerlo sería mentir. Los mercados
son pre-partida y se cierran en el kickoff; el backend rechaza apuestas
posteriores con `MATCH_STARTED`.

**¿Cómo se liquidan fútbol y NBA?**
ESPN deja el marcador final en `sport_results` (`READY` o `VOID`). Desde ahí el
mismo `MarketResultService` resuelve 1X2, total de goles, ganador y total de
puntos, y el settlement paga o reembolsa sin consultar ESPN.

**¿Y si ESPN cambia o se cae?**
Es una API no oficial y sin SLA. Si falla, el calendario queda vacío o `STALE`
y, sin tabla, se publican cuotas planas de liga. Dota no se ve afectado.

**¿Qué pasa si el feed se cae?**
El colector guarda en spool y reintenta; el backend suspende mercados por lag y
aplica `close-grace` de 120 s; la UI reconecta el SSE y muestra el estado del
feed.

**¿Qué pasa si OpenDota no responde?**
El catálogo queda vacío pero la app abre; los mercados GSI se crean igual. Hay
caché y backoff.

**¿Cómo saben que el resultado es correcto?**
`match_results` se toma de GSI y se verifica con OpenDota cuando hay `match_id`.
Ante discrepancia, la apuesta queda en `NEEDS_REVIEW` y decide el admin.

**¿Escala?**
No es el objetivo. Es un monolito modular local-first. La consistencia
transaccional vale más que el escalado horizontal para este caso.

**¿La UI muestra que es una demo?**
No: la app se presenta como producto. El contexto académico y el saldo
simulado están documentados en README/runbook (ADR-037).

## Lo que no se debe afirmar

- No decir que se procesan pagos reales: no hay pasarela.
- No decir que hay cobertura o apuestas en vivo de fútbol/NBA: solo
  pre-partida, con cierre en el kickoff.
- No decir que las cuotas de fútbol/NBA son de mercado: son propias, basadas
  en la tabla de ESPN.
- No decir que OpenDota es tiempo real: tiene delay y se etiqueta.
- No decir que el stream es propio: se embebe el canal oficial.
- No decir que los bots generan datos completos: en práctica solo hay jugador
  local, sin edificios rivales ni Roshan.

## Checklist técnico previo

- [ ] Docker Desktop abierto y `dist/betpulse-demo-kit` copiado.
- [ ] `start.ps1` levanta PostgreSQL, backend y frontend `healthy`.
- [ ] Internet disponible para OpenDota y ESPN (o hotspot).
- [ ] Admin: `admin@betpulse.local` / `Admin123!`.
- [ ] Usuario de demo con saldo cargado desde `/admin/users`.
- [ ] Tarjeta de prueba verificada en `/wallet` con los datos de la tabla.
- [ ] `/sports` con pestañas Fútbol y NBA y cuotas visibles (esperar ~30 s tras arrancar).
- [ ] Una apuesta pre-partida de prueba registrada con hold.
- [ ] Dota 2 con `-gamestateintegration` y el `.cfg` instalado (si se usa GSI).
- [ ] Stream oficial asignado en `/admin/streams` (si se va a mostrar).
- [ ] Pestañas listas: lobby, partido, `/sports`, wallet, apuestas, admin, Dota 2.
- [ ] Fuente de energía y notificaciones silenciadas.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| No hay torneo en vivo | Bots o ranked de OpenDota |
| GSI no envía | Revisar `.cfg`, launch option y modo espectador |
| El partido no termina | Usar bots y cerrar la partida |
| SSE no actualiza | Verificar proxy y reconexión |
| Stream oficial offline | Usar `fallback_url`; probar Twitch/YouTube antes |
| Sin internet | Hotspot; la app abre con lobby vacío y mercados GSI si hay partida |
| ESPN caído o sin partidos | `/sports` queda vacío o sin cuotas; Dota no se afecta. Se puede omitir el segmento pre-partida |
| Fecha de tarjeta rechazada | Ya corregido: se acepta cualquier fecha válida (ADR-041) |
