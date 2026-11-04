# M6d — Cuenta, rail en vivo y checkout simulado (2026-11-04)

Cerrado. Alcance: completar la experiencia de producto para la demo con cuenta
de usuario, cambio de contraseña, carrusel de partidas en vivo y checkout
simulado de recarga/retiro. Decisión: ADR-038.

## Realizado

- `/account`: datos de la cuenta (nombre, correo, alta, rol), resumen de wallet,
  enlaces a billetera/apuestas y formulario de cambio de contraseña.
- Backend: `POST /api/auth/password` con validación de contraseña actual,
  política y contraseña distinta; `UserResponse` expone `createdAt`.
- Header autenticado con menú de usuario: Mi cuenta, Mi billetera, Mis apuestas,
  Admin (solo `ADMIN`) y Salir. En móvil, enlaces equivalentes en el menú.
- Lobby: `LiveRail` reemplaza el ticker delgado con tarjetas horizontales de
  partidas en vivo, escudos, marcador, tiempo y cuotas del mercado principal.
- `/wallet`: checkout simulado con método de pago, resumen, procesamiento y
  pantalla de éxito con el nuevo saldo. Sin datos de tarjeta ni pasarela real.
- Copy de producto revisado: sin “ficticio”, “académico”, “soles peruanos” ni
  “demo” en la interfaz; footer solo con copyright.

## Verificación

- Backend: 101/101 tests verdes; `AuthFlowTest` cubre cambio de contraseña,
  rechazo de la anterior e inicio con la nueva.
- Frontend: lint y build verdes; `/account` generada junto con el resto de rutas.
- Prueba de API real contra el entorno local: registro → `me` con `createdAt` →
  cambio de contraseña → depósito S/ 150.00 → consulta de saldo → admin busca al
  usuario y acredita S/ 50.00 (saldo final S/ 200.00).
- QA manual: dropdown del header, `/account`, carrusel en vivo, checkout y
  `/admin/users`.

## Deuda trasladada

- M7: invalidar otras sesiones al cambiar contraseña, rate limiting, MFA, CSP
  completa, E2E, carga y empaquetado.
- M8: fútbol/NBA pre-partida y “Próximos”.
