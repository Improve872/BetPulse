# M6c — Copy de producto y saldo administrativo (2026-11-04)

Cerrado. Alcance: quitar avisos de demo de la UI, footer sobrio, enlace Admin
visible y ajuste de saldo desde admin. Decisión: ADR-037.

## Realizado

- Se eliminaron de la interfaz “saldo ficticio”, “partidas reales”, “proyecto
  académico” y el chip DEMO.
- Footer global: solo `© 2026 BetPulse.` Sin Dota 2 ni avisos legales.
- Wallet: “Mi billetera”, “Gestiona tu saldo y revisa tus movimientos”,
  “Recargar saldo”, “Saldo acreditado”. Sin banner de modo demo.
- Header: enlace **Admin** visible solo para `ROLE_ADMIN`.
- `/admin/users`: búsqueda por correo/nombre, saldo disponible/retenido,
  acreditar o debitar con motivo.
- Migración V11: tipo `ADMIN_ADJUSTMENT` en `ledger_transactions`.
- Ajuste con ledger de doble entrada (`USER_AVAILABLE` contra `HOUSE`),
  idempotencia por usuario y auditoría `WALLET_ADMIN_ADJUSTMENT`.
- No se siembra usuario demo; el registro público crea wallet en cero.

## Verificación

- Backend: 100/100 tests verdes; `AdminUserFlowTest` cubre crédito, replay
  idempotente, débito, auditoría, búsqueda y débito sin saldo.
- Frontend: lint y build verdes; `/admin/users` generada.
- QA visual: lobby sin chip DEMO, footer solo copyright, `/admin/users` con
  búsqueda y panel de ajuste.
- Prueba de API real: admin acreditó S/ 250.00 a un usuario de test; el saldo
  se reflejó y la operación quedó auditada.

## Deuda trasladada

- M7: rate limiting, MFA, CSP completa, E2E, carga y empaquetado.
- M8: fútbol/NBA pre-partida y “Próximos”.
