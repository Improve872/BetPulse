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
- Saldo disponible junto al usuario con botón de ojo para ocultarlo; preferencia
  persistida y refresco al operar la billetera, apostar, recuperar foco y cada 30 s.
- Lobby: `LiveRail` reemplaza el ticker delgado con tarjetas horizontales de
  partidas en vivo, escudos, marcador, tiempo y cuotas del mercado principal.
- `/wallet`: checkout de pasarela en tres pasos (monto → pago → confirmar) con
  resumen, procesamiento y comprobante.
  - Tarjeta con vista previa, detección Visa/Mastercard/Amex, formato, vencimiento,
    CVV y titular; validación de longitud/marca sin Luhn.
  - Yape/Plin con celular de 9 dígitos, OTP de 6 casillas y reenvío con cuenta
    regresiva.
  - Transferencia con banco, cuenta/CCI, referencia y número de operación.
  - Datos sensibles solo en memoria, enmascarados en la revisión y descartados al
    terminar; el backend solo recibe `amountCents` e `Idempotency-Key`.
  - Logos locales de métodos como indicadores, sin sellos de certificación.
- Copy de producto revisado: sin “ficticio”, “académico”, “soles peruanos” ni
  “demo” en la interfaz; footer solo con copyright.

## Verificación

- Backend: 101/101 tests verdes; `AuthFlowTest` cubre cambio de contraseña,
  rechazo de la anterior e inicio con la nueva.
- Frontend: lint y build verdes; `/account` generada junto con el resto de rutas.
- Prueba de API real contra el entorno local: registro → `me` con `createdAt` →
  cambio de contraseña → depósito S/ 150.00 → consulta de saldo → admin busca al
  usuario y acredita S/ 50.00 (saldo final S/ 200.00).
- QA de checkout con navegador automatizado: Yape + OTP, tarjeta Visa,
  transferencia de recarga, transferencia de retiro, errores de tarjeta/OTP y
  copy EN, a 1440 px y 390 px. Sin errores de consola.
- Red: los POST de wallet solo llevan `amountCents`; ningún dato sensible sale
  del navegador.
- QA manual: dropdown del header, `/account`, carrusel en vivo y `/admin/users`.

## Deuda trasladada

- M7: invalidar otras sesiones al cambiar contraseña, rate limiting, MFA, CSP
  completa, E2E, carga y empaquetado.
- M8: fútbol/NBA pre-partida y “Próximos”.
