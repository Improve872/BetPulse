# Plan de seguridad — BetPulse

## Objetivo y alcance

Proteger cuentas, saldos, apuestas, cuotas, panel administrativo, datos personales y la integridad del sistema, aplicando controles proporcionales a una plataforma financiera simulada. El plan cubre autenticación, autorización, validación, transporte, datos, negocio, integraciones, auditoría y respuesta a incidentes.

## Activos

- Credenciales y sesiones.
- Saldos, ledger y movimientos.
- Apuestas, cuotas, mercados y liquidaciones.
- Panel administrativo y configuración.
- Datos personales (email, nombre).
- Logs y auditoría.
- Infraestructura (PostgreSQL, colector, API).
- Integridad del juego y reputación del proyecto.

## Estado implementado (2026-11-01)

| Control | Estado | Evidencia |
|---|---|---|
| Auth con BCrypt 12, sesión HttpOnly y CSRF | Implementado | `AuthFlowTest`, `SecurityConfig` |
| RBAC admin con `@EnableMethodSecurity` | Implementado | `AdminBetController`, `AdminMarketController` |
| Ingest GSI con HMAC-SHA256 y ventana de 5 min | Implementado | `IngestSignature`, `IngestFlowTest` |
| Idempotencia de snapshots y eventos | Implementado | `snapshot_id` único y `UNIQUE (match_id, event_id)` |
| Ledger de doble entrada y saldos no negativos | Implementado | `WalletFlowTest`, constraints V2 |
| Liquidación exactly-once | Implementado | `settlements` PK `bet_id`, `SettlementFlowTest` |
| Auditoría append-only | Implementado | `audit_logs`, ADR-030/ADR-033 |
| Suspensión por feed, pausa y eventos | Implementado | `FEED_STALE`, `MATCH_PAUSED`, `EVENT_SUSPENSION` |
| Límite de stake en práctica | Implementado | S/ 100 vía `practice-max-stake-cents` |
| Rate limiting | **No implementado** | Pendiente M7 |
| MFA para admin | **No implementado** | Pendiente M7 |
| CSP y headers de seguridad | **No implementado** | Pendiente M7 |
| Rol `TRADER` operativo | **No implementado** | El rol existe; no hay endpoints/UI |
| Rol `AUDITOR` operativo | **No implementado** | El rol existe; no hay endpoints/UI |
| Backups y restauración probados | **No implementado** | Pendiente de entorno |
| Escaneo de dependencias | Parcial | `npm audit` reporta 2 transitivas |

## Roles y permisos

| Rol | Permisos |
|---|---|
| Visitante | Ver catálogo, cuotas y registro/login |
| Usuario | Su perfil, wallet, apuestas, depósitos/retiros simulados |
| Trader | Suspender/reanudar mercados, cuotas manuales, ver exposición |
| Admin | Usuarios, liquidaciones, void, configuración, pagos |
| Auditor | Lectura de auditoría y ledger |

Reglas:

- No hay registro público de admin.
- Admin sembrado y protegido.
- Mínimo privilegio.
- Acciones sensibles con motivo y auditoría.
- MFA TOTP recomendado para admin.

## Modelo de amenazas (STRIDE)

| Amenaza | Ejemplo | Mitigación |
|---|---|---|
| Spoofing | Robo de sesión, login falso | Cookies HttpOnly, CSRF, rate limit, MFA admin |
| Tampering | Alterar cuotas o apuestas | Cuotas server-side, versionado, constraints, auditoría |
| Repudiation | Negar una acción admin | Logs inmutables con actor, timestamp y motivo |
| Information disclosure | Ver apuestas de otro usuario | RBAC, ownership checks, TLS, CSP |
| Denial of service | Flood de apuestas o login | Rate limiting, límites de payload, timeouts |
| Elevation of privilege | Usuario accede a admin | RBAC, method security, rutas protegidas |

## Controles por capa

### Autenticación

- Hash de contraseñas con Argon2id o BCrypt costo 12.
- Política de contraseñas y bloqueo por intentos.
- Cookies `HttpOnly`, `Secure`, `SameSite`.
- Rotación de sesión y logout.
- MFA TOTP recomendado para admin.
- Rate limiting en login y registro.
- Mensajes de error genéricos.

### Autorización

- RBAC con `@PreAuthorize`.
- Verificación de ownership en wallet, apuestas e historial.
- Rutas admin separadas y protegidas.
- Auditoría de acciones administrativas.
- No confiar en roles enviados por el cliente.

### Entrada y salida

- Bean Validation.
- Consultas parametrizadas/JPA.
- Escape de salida en React.
- Evitar `dangerouslySetInnerHTML`.
- Límites de tamaño y allowlists.
- Validación de URLs de streaming.
- Manejo de errores sin stack traces.

### Transporte y headers

- TLS en LAN/producción.
- HSTS, CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- CORS allowlist.
- `frame-ancestors` y `frame-src` para Twitch/YouTube.

### Infraestructura

- Contenedores non-root.
- Imágenes mínimas.
- PostgreSQL no expuesto.
- Firewall y red segmentada.
- Backups y prueba de restauración.
- Usuario de DB con privilegios mínimos.

## Seguridad financiera y de apuestas

- Ledger de doble entrada; cada transacción suma cero.
- `CHECK (available_cents >= 0)` y `CHECK (held_cents >= 0)`.
- Locks/optimistic locking en wallet.
- Holds al apostar.
- Idempotencia en apuestas, depósitos y retiros.
- `settlements` con `bet_id` como clave primaria para exactly-once.
- Validación de `market_version` y cuota aceptada.
- Suspensión por evento, lag o pausa (`EVENT_SUSPENSION`, `MATCH_PAUSED`, `FEED_STALE`).
- Límites de stake, payout y exposición; S/ 100 en partidas de práctica.
- Historial de cuotas con features y versión de modelo; override admin en `odds_history` con `ADMIN_OVERRIDE`.
- Auditoría de ajustes manuales, anulaciones y liquidaciones.
- Liquidación: gana `USER_HELD -stake`, `USER_AVAILABLE +payout`, `HOUSE -(payout-stake)`; pierde `USER_HELD -stake`, `HOUSE +stake`; void devuelve el stake.
- Conciliación periódica ledger vs saldos (pendiente de automatizar).

## Seguridad de integraciones

### GSI

- Colector escuchando solo en `127.0.0.1:3001`.
- Token de autenticación en el `.cfg` (`GSI_TOKEN`).
- HMAC-SHA256 sobre `timestamp + "." + body`; cabeceras `X-BetPulse-Timestamp` y `X-BetPulse-Signature`.
- Ventana de 5 minutos para rechazar firmas viejas.
- `/internal/**` queda fuera de CSRF pero exige firma; no hay sesión de usuario.
- Validación de esquema, tamaño máximo (10 MB) y campos obligatorios.
- Replay protection: `snapshot_id` único y `UNIQUE (match_id, event_id)`.
- Spool local en `INGEST_SPOOL_DIR` si el backend cae; los batches no se versionan.
- El secreto (`INGEST_SECRET`) va por entorno; los valores por defecto son solo de desarrollo.
- Los eventos no se consideran confiables hasta validar firma, ventana e idempotencia.

### OpenDota

- API key en variable de entorno.
- Rate limit y backoff.
- Validación de respuestas.
- No usar como única fuente de settlement sin verificación.

### Streaming

- Solo iframes oficiales de Twitch/YouTube.
- Allowlist de dominios.
- CSP `frame-src`.
- Sin re-transmisión.
- URL administrada por admin y validada.

### Pagos simulados

- No se solicitan datos reales de tarjeta.
- Proveedor fake con estados.
- Webhooks HMAC e idempotencia.
- Retiros con aprobación admin.
- Aviso claro de simulación.
- Sin PAN/CVV ni integración real.

## Secretos y configuración

- Variables de entorno, nunca en el repo.
- Variables usadas: `INGEST_SECRET`, `GSI_TOKEN`, `ADMIN_PASSWORD`, `OPENDOTA_API_KEY`, `SESSION_COOKIE_SECURE`; `STEAM_API_KEY` cuando exista.
- Valores por defecto (`betpulse-dev-ingest-secret`, `betpulse-dev-token`, `Admin123!`) son solo para desarrollo.
- `.env.example` sin valores reales.
- Rotación de secretos.
- Sin secretos en logs.
- Configuración separada por entorno.
- Acceso restringido a la PC de demo.

## Registro, auditoría y monitoreo

- `audit_logs` append-only.
- Eventos: login, logout, fallo de login, apuesta, cancelación, liquidación, ajuste de saldo, cambio de cuota, suspensión, cambio de rol.
- Campos: actor, acción, entidad, antes/después, IP, user agent, timestamp, motivo.
- Alertas: desbalance de ledger, feed lag, intentos de login fallidos, apuestas inusuales, acciones admin.
- Dashboard de salud en admin.

## Protección de datos personales

- Minimización: solo email, nombre y datos necesarios.
- Aviso de privacidad y consentimiento en el registro.
- Confirmación de mayoría de edad.
- Aviso de dinero ficticio.
- Retención limitada y eliminación de cuentas demo.
- Acceso y rectificación.
- Referencia a la Ley N.° 29733 de Protección de Datos Personales del Perú.
- No se realiza KYC real ni se almacenan documentos.

## Registro de usuarios y cumplimiento simulado

- Registro con email, contraseña, aceptación de términos y privacidad, confirmación 18+.
- Aviso visible: “Plataforma de demostración. El saldo es ficticio. No se realizan apuestas con dinero real.”
- Enlace simulado a Libro de Reclamaciones (opcional, para emular una casa peruana).
- Aviso de juego responsable y límites configurables.
- Admin separado, con roles y auditoría.
- Bitácora de accesos y acciones.

## Pruebas de seguridad

- Unitarias e integración de auth y RBAC.
- IDOR: usuario no accede a wallet/apuestas de otro.
- CSRF, XSS, SQLi.
- Rate limiting.
- Concurrencia: doble apuesta, doble settlement, saldo negativo.
- Idempotencia de pagos y apuestas.
- Validación de cuotas obsoletas.
- SAST: SpotBugs/Sonar.
- Dependencias: OWASP Dependency-Check/Dependabot.
- DAST: OWASP ZAP.
- Checklist OWASP ASVS nivel 1/2.

## Respuesta a incidentes

- Clasificación de severidad.
- Detección y alerta.
- Contención (suspender mercados, bloquear cuenta, rotar secretos).
- Recuperación desde backup.
- Postmortem sin culpables.
- Registro de lecciones aprendidas.

## Riesgos residuales

- Es una demo: no hay KYC/AML real.
- No hay pasarela de pagos real.
- GSI es local y con delay.
- La red del aula puede fallar (mitigado con local-first).
- El streaming depende de internet.
- El modelo de cuotas no busca precisión comercial.

## Checklist mínimo

- [ ] Auth con hash fuerte y sesiones seguras.
- [ ] RBAC y rutas admin protegidas.
- [ ] CSRF, CSP y headers.
- [ ] Rate limiting en login/apuestas/pagos.
- [ ] Validación de entrada y consultas parametrizadas.
- [ ] Ledger con constraints e idempotencia.
- [ ] Suspensión por lag/evento.
- [ ] Auditoría de acciones críticas.
- [ ] Secretos fuera del repo.
- [ ] Backups y restauración probados.
- [ ] Escaneo de dependencias.
- [ ] Pruebas de concurrencia y seguridad.
- [ ] Aviso de demo y juego responsable.
