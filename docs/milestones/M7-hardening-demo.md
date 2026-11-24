# M7 — Hardening y empaquetado de demo (2026-11-16)

Cerrado en su base. Alcance: dejar la aplicación lista para la presentación con
controles de seguridad, verificación automatizada y un kit Docker que arranca
sin instalar Java, Node ni PostgreSQL en la laptop. Decisiones: ADR-040,
ADR-041 y ADR-042.

## Realizado

- Rate limiting en memoria por ruta y método (`RateLimitFilter`): login,
  registro, contraseña, apuestas, wallet, admin e ingesta; responde `429` con
  `Retry-After`.
- CSP completa sin nonce y headers de seguridad: `nosniff`, `X-Frame-Options`,
  `Referrer-Policy`, `Permissions-Policy`; `frame-src` limitado a Twitch y
  YouTube.
- Tests de control de acceso: `USER` recibe `403` en todos los paneles y
  acciones de admin; anónimo recibe `401`. Se corrigió `GlobalExceptionHandler`
  para no devolver `500`.
- Checkout de tarjeta corregido: vencimiento `MM/AA` o `MM/AAAA`, mes de un
  dígito y sin comparación contra el reloj (ADR-041).
- Vitest en el frontend: `npm test` cubre `lib/checkout.ts` con 18 casos,
  incluida la regresión de fecha vencida; entra al CI junto a lint y build.
- `docs/demo.md` como guion técnico: arquitectura, flujos, invariantes de
  dinero, datos de demo y preguntas del jurado.
- Dockerfiles multietapa, `output: "standalone"`, `infra/docker-compose.demo.yml`
  con healthchecks y `demo-kit/` con arranque, parada, reset y `.tar` de
  imágenes. Sin colector ni GSI en el paquete.
- Kit de demo regenerado el 2026-11-24 con M8 (V13, fútbol y NBA) y probado en
  limpio en el puerto `3100`.

## Verificación

- Backend: 116/116 tests al cerrar la base (hoy 139/139 con M8).
- Frontend: 18/18 tests de checkout; lint y build verdes.
- Headers verificados en `next start`: CSP completa y headers de seguridad.
- Docker: imágenes construidas, `docker compose up --wait` deja los tres
  servicios `healthy`; reinicio con `down`/`up` conserva usuario y saldo.
- CI verde en `f7e1bae` al cierre de la base y en `5467de0` con M8.
- Kit: carga desde `.tar`, arranca en `3100`, aplica V1–V13 y responde la app.

## Deuda trasladada

- E2E de flujos de dinero con Playwright (opcional tras la demo).
- Actualización mayor de Next para cerrar las vulnerabilidades de `npm audit`
  (2 de producción, 6 de desarrollo; sin críticas).
- OpenAPI, ERD y runbook completo si el alcance académico los exige.
