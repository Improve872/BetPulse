# Dominio — BetPulse

## Glosario

- **Match:** partida de Dota 2.
- **Market:** mercado de apuesta (ej. ganador del mapa).
- **Selection:** resultado apostable dentro de un mercado (ej. Radiant).
- **Odds:** cuota decimal.
- **Fair probability:** probabilidad estimada por el modelo, sin margen.
- **Margin:** margen de la casa.
- **Hold:** retención temporal de saldo al apostar.
- **Settlement:** liquidación de una apuesta.
- **Void:** anulación con devolución del stake.
- **Parlay:** apuesta combinada (fuera del MVP).
- **Cashout:** retiro anticipado (fuera del MVP).

## Dinero

- Moneda: PEN ficticio.
- Almacenamiento: `BIGINT` en céntimos.
- Formato de UI: `S/ 1,250.00` con `es-PE`.
- Nunca usar `float`/`double` para dinero.
- Payout: `round_half_up(stake_cents × odds)`.
- Ledger: doble entrada; cada transacción suma cero.
- `wallets.available_cents >= 0`, `wallets.held_cents >= 0`.

## Cuotas y probabilidad

- Cuota decimal con 3 decimales.
- Probabilidad con 8 decimales.
- Margen configurable (inicial: 6%).
- Fórmula: `odds = 1 / (p × (1 + margin))`.
- La suma de probabilidades implícitas puede superar 1; ese exceso es el margen.
- El cliente envía `marketVersion` y `expectedOdds`; el servidor valida.
- Si la cuota cambió o el mercado está suspendido, se rechaza la apuesta.

### Modelo pre-partida

- Elo/Glicko desde OpenDota.
- Ajuste por draft, lado y forma reciente.
- `P(Radiant) = 1 / (1 + 10^((R_Dire - R_Radiant)/400))`.

### Modelo en vivo

- Regresión logística con:
  - diferencia de oro;
  - diferencia de XP;
  - diferencia de kills;
  - torres;
  - racks;
  - Roshan;
  - tiempo de juego;
  - draft.
- Se recalcula con cada evento relevante y con un tick periódico.
- Un kill no cambia la cuota por sí solo: cambia el estado (oro, XP, kills, objetivos).
- La cuota se versiona y se publica por SSE.

## Mercados del MVP

| Mercado | Regla de liquidación |
|---|---|
| Ganador del mapa | Gana el equipo con `win_team` / ancient destruido |
| Total de kills O/U | Suma final de kills de ambos equipos |
| Hándicap de kills | Diferencia final de kills |
| Primera sangre | Primer kill del mapa |
| Primera torre | Primera torre destruida |
| Siguiente Roshan | Próximo Roshan muerto tras abrir el mercado |
| Duración O/U | Tiempo de juego al destruirse el ancient |

Recomendación: usar líneas `.5` para evitar empates/push en el MVP. Si se usa línea entera y el resultado coincide exactamente, el mercado se anula (void).

## Ciclo de vida de un mercado

Estados:

- `SCHEDULED`: creado, aún no abierto.
- `OPEN`: acepta apuestas.
- `SUSPENDED`: no acepta apuestas temporalmente.
- `CLOSED`: no acepta apuestas; esperando liquidación.
- `SETTLED`: liquidado.
- `VOID`: anulado.

Reglas:

- Se abre al publicar cuotas.
- Se suspende ante kill, torre, Roshan, pausa, lag o fin de partida.
- Se reabre tras recalcular y aplicar un debounce (2–3 s).
- Se cierra al terminar el partido.
- Se liquida una sola vez.

## Ciclo de vida de una apuesta

Estados:

- `PLACED`: aceptada y con hold.
- `WON`: liquidada a favor.
- `LOST`: liquidada en contra.
- `VOID`: anulada y reembolsada.
- `NEEDS_REVIEW`: discrepancia o caso dudoso.
- `CASHED_OUT`: futuro, fuera del MVP.

Reglas:

- Se crea con `idempotency_key`.
- Se guarda `market_version` y `odds_accepted`.
- Se retiene el stake al aceptar.
- Se liquida exactly-once.
- El payout se acredita al wallet.

## Wallet y ledger

Cuentas:

- `USER_AVAILABLE`: saldo disponible del usuario.
- `USER_HELD`: saldo retenido por apuestas.
- `HOUSE`: contraparte de la casa.
- `HOUSE_REVENUE`: margen/ganancia.
- `PENDING_PAYOUT`: payouts pendientes.
- `EXTERNAL`: depósitos/retiros simulados.

Operaciones:

- Depósito demo: `EXTERNAL` → `USER_AVAILABLE`.
- Apuesta: `USER_AVAILABLE` → `USER_HELD`.
- Apuesta ganada: `USER_HELD` → `USER_AVAILABLE` (stake + payout) y `HOUSE` por la parte correspondiente.
- Apuesta perdida: `USER_HELD` → `HOUSE`.
- Void: `USER_HELD` → `USER_AVAILABLE`.
- Retiro demo: `USER_AVAILABLE` → `EXTERNAL`.

Reglas:

- Cada transacción suma cero.
- Idempotencia en depósitos, retiros y apuestas.
- No se permite saldo disponible negativo.
- No se permite retirar saldo retenido.
- Conciliación periódica ledger vs saldos.

## Suspensión

Suspender mercados ante:

- kill;
- torre destruida;
- Roshan;
- pausa;
- lag del feed;
- draft;
- fin de partida;
- discrepancia de datos;
- exposición excedida.

La suspensión debe ser visible en la UI con motivo y hora.

## Liquidación

Fuente de verdad:

- GSI para el estado final del partido espectado.
- OpenDota para verificación cuando exista `match_id`.
- Si hay discrepancia: `NEEDS_REVIEW` y decisión admin.

Reglas:

- Una sola liquidación por apuesta (`UNIQUE (bet_id)`).
- Payout calculado con la cuota aceptada, no con la cuota final.
- Si el partido se abandona o no hay resultado válido: void y reembolso.
- Si no hay primera sangre, primera torre o próximo Roshan: void.
- Si el feed se corta antes del final: `NEEDS_REVIEW` o void según evidencia.
- Auditoría de cada liquidación y ajuste.

## Invariantes

- `wallets.available_cents >= 0`.
- `wallets.held_cents >= 0`.
- `ledger_entries` suma cero por transacción.
- `bets` unique `(user_id, idempotency_key)`.
- `settlements` unique `bet_id`.
- `game_events` unique `(match_id, event_id)`.
- `odds_history` append-only.
- `audit_logs` append-only.

## Escenarios de aceptación

1. Registro → depósito demo → saldo visible.
2. Apuesta con saldo suficiente → hold y apuesta `PLACED`.
3. Apuesta con saldo insuficiente → rechazo sin cambios.
4. Doble clic en apostar → una sola apuesta.
5. Cuota cambia entre clic y aceptación → rechazo con cuota nueva.
6. Mercado suspendido → rechazo.
7. Kill en el partido → cuota se recalcula y versiona.
8. Feed atrasado → mercados suspendidos.
9. Partido termina → apuestas liquidadas una sola vez.
10. Apuesta ganadora → payout acreditado.
11. Apuesta perdedora → stake a la casa.
12. Void → stake reembolsado.
13. Admin cambia cuota → auditoría con motivo.
14. Intento de ver apuesta de otro usuario → denegado.
15. Reinicio del backend → ledger y apuestas consistentes.
