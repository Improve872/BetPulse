# M5 — Liquidación exactly-once (2026-11-01)

Cerrado. Tests principales en `SettlementFlowTest`, `MarketResultFlowTest` y
`MarketOutcomeResolverTest`.

## Realizado

- Migración `V9__settlements_audit.sql`: `settlements` (PK `bet_id`), `audit_logs`
  append-only y tipo de ledger `BET_VOID`.
- `SettlementService` consume `market_results` y liquida cada apuesta una sola
  vez: `WON`, `LOST` o `VOID`.
- Wallet: gana libera hold y acredita payout; pierde mueve el stake a la casa;
  void reembolsa. Todas las transacciones suman cero y respetan saldos no
  negativos.
- `bets.status` y `bet_status_history` se actualizan con la liquidación.
- `audit_logs` registra `BET_SETTLED` y `BET_VOIDED`.
- Scheduler cada 5 s; se puede desactivar con
  `betpulse.settlement.scheduler-enabled=false`.
- Admin: `POST /api/admin/bets/{id}/void` con rol `ADMIN`, motivo obligatorio,
  reembolso, settlement `VOID` y auditoría.
- `/api/admin/bets` lista apuestas por estado para revisión.
- UI: `/bets` muestra pago y fecha de liquidación; `/admin` lista apuestas en
  revisión/pendientes y permite anular.
- Tests: 7 en `SettlementFlowTest` (gana, pierde, void, anulación admin por
  servicio y por endpoint, espera de resultado, concurrencia).

## Deuda trasladada a M2b

- Mercados de primera sangre, primera torre y siguiente Roshan.
- SSE por partido con scoreboard y timeline.
- Suspensión por kill/torre/Roshan además de pausa.
- Conciliación automática de discrepancias GSI/OpenDota.
