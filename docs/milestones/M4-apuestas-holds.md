# M4 — Apuestas simples y holds (2026-10-27)

Cerrado funcionalmente. Los tests de este hito se ejecutan en `BetFlowTest`.

## Realizado

- Migración `V4__betting.sql`: `bets` y `bet_status_history` append-only.
- `POST /api/bets` autenticado, con `Idempotency-Key` obligatoria y `UNIQUE (user_id, idempotency_key)`.
- Validación server-side de mercado abierto, selección, `marketVersion`, `expectedOdds` y stake.
- El stake se retiene en la misma transacción con `USER_AVAILABLE` → `USER_HELD`; la apuesta guarda la transacción de hold.
- Límites iniciales: stake entre S/ 1.00 y S/ 1,000.00; payout potencial máximo S/ 10,000.00.
- Replay idempotente devuelve la misma apuesta sin retener dos veces; una misma clave con datos distintos devuelve conflicto.
- `GET /api/bets` y `GET /api/bets/{id}` filtran siempre por el usuario de la sesión.
- Frontend: bet slip real, stake, payout potencial, estados de error, selección desde cards o modal, panel móvil y página `/bets`.
- Tests: `BetFlowTest` 9 (hold, replay, mismatch, versión/cuota obsoleta, mercado suspendido, fondos insuficientes, payout máximo, aislamiento por usuario, concurrencia y CSRF).

## Deuda trasladada a M5

- Liquidación exactly-once, payout/void, actualización de wallet y auditoría de settlement.
- Cancelación de apuestas y estados `NEEDS_REVIEW` operativos.
- Exposición agregada y límites por usuario/mercado.
