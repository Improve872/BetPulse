# Demo — BetPulse

## Objetivo

Demostrar en una sola laptop el ciclo completo: partida real de Dota 2 →
GSI → cuotas propias → apuesta → liquidación → wallet → auditoría, más el
feed de torneos/ranked de OpenDota y el panel admin.

## Fuentes (decisión M0)

| Fuente | Uso | Estado |
|---|---|---|
| DotaTV en vivo | Partida espectada completa: 10 jugadores, Roshan, torneos | Probada |
| Bots en local | Partida controlable para primera sangre/torre y final rápido | Probada |
| OpenDota `/live` | Torneos y ranked sin espectar; cuotas que fluctúan | Implementada |
| OpenDota `/matches/{id}` | Verificación y objetivos post-partida | Implementada |
| Replay | Descartado por producto | No se usa |

**Demo principal:** una partida con bots o un torneo en vivo. Si no hay torneo,
los bots dan el control total y permiten terminar la partida a voluntad.

## Demo Docker (recomendada)

La presentación usa **frontend + backend + PostgreSQL** en Docker. No incluye
Dota 2, GSI ni colector.

En la PC de la demo:

```powershell
# Copiar dist/betpulse-demo-kit a C:\BetPulseDemo
cd C:\BetPulseDemo
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

- Abre `http://localhost:3000`.
- Admin: `admin@betpulse.local` / `Admin123!`.
- `stop.ps1` detiene conservando datos; `reset.ps1` deja la base limpia.
- Si el puerto `3000` está ocupado: `.\start.ps1 -Port 3100`.
- Requiere Docker Desktop abierto e internet para OpenDota.
- El kit carga las imágenes desde `betpulse-demo-images.tar`; no necesita registro.

Para generar el kit desde el repo:

```powershell
.\scripts\demo-package.ps1
```

## Desarrollo local

```powershell
docker compose -f infra/docker-compose.yml up -d postgres
cd backend; .\mvnw.cmd spring-boot:run
cd ..\collector; java -jar target\collector-0.1.0-SNAPSHOT-shaded.jar
cd ..\frontend; npm run dev
```

Dota 2: `-gamestateintegration` y el `.cfg` instalado con
`scripts/install-gsi-config.ps1`.

Abrir dos perfiles del navegador:

- usuario nuevo (regístrate con cualquier correo);
- admin (`admin@betpulse.local` / `Admin123!`), que puede acreditarle saldo desde `/admin/users`.

El header del usuario autenticado muestra el saldo junto al nombre, con un ojo
para ocultarlo, y abre un menú con **Mi cuenta**, **Mi billetera**, **Mis apuestas**,
**Admin** (si aplica) y **Salir**. En `/account` se ven los datos y se cambia la
contraseña; en `/wallet` se prueba el checkout.

En `/admin/streams`, asignar un canal oficial de Twitch o un video de YouTube
a la partida o liga que se mostrará. Sin stream asignado, la UI muestra el
fallback “sin stream oficial”; no se inventa señal.

## Guion (15–20 min)

| Minuto | Acción |
|---|---|
| 0–2 | Presentar BetPulse: apuestas de esports, datos reales y panel administrativo |
| 2–4 | Registro/login, menú de usuario, `/account` y cambio de contraseña; wallet en S/ y admin acreditando saldo desde `/admin/users` |
| 4–6 | Lobby: partido destacado, carrusel “En vivo ahora”, escudos, tabs, cuotas y boleto; abrir el detalle y reproducir el stream oficial |
| 6–9 | Checkout en `/wallet`: tarjeta con vista previa, Yape/Plin con celular y OTP, o transferencia con banco/CCI; revisar y confirmar, ver el comprobante con nuevo saldo |
| 9–11 | "Mi partida": iniciar partida con bots en Dota 2 o entrar a DotaTV |
| 11–14 | Mostrar `/match/[id]`: marcador, stream, mercados, timeline, Roshan y SSE |
| 14–16 | Apostar a primera sangre o primera torre; ver hold y `/bets` |
| 16–18 | Provocar el evento en la partida; el mercado se cierra |
| 18–19 | Terminar la partida o esperar `POST_GAME`; liquidación automática |
| 19–20 | Wallet actualizada, pago, estado `WON/LOST/VOID`, auditoría y repaso del admin |

## Liquidación

- La partida con bots se puede terminar cuando quieras: al llegar `POST_GAME`
  el backend guarda `match_results` y los schedulers resuelven y pagan en menos
  de un minuto.
- En DotaTV, elegir un partido cerca del final o mostrar la liquidación de uno
  ya terminado, claramente etiquetado.
- No usar resultados inventados.

## Verificación real ya realizada

- Payload GSI → colector → backend → lobby con 1 partida GSI y 6 mercados.
- Pausa → 6 mercados `SUSPENDED` con `MATCH_PAUSED`.
- Apuesta S/ 10 a ganador en una partida GSI → `POST_GAME` → liquidación `WON`
  con payout S/ 10.96 y wallet actualizada.
- Admin: suspender, reanudar y override auditados.
- M6a: lobby con partido destacado, escudos reales, tabs y boleto revisado con
  feed OpenDota a 1440 px y 390 px.
- M6b: asignación de stream desde `/admin/streams`, CTA en el hero, player
  click-to-load en `/match/[id]` y fallback probados con Twitch.
- M6c: admin acreditó S/ 250.00 a un usuario de test desde `/admin/users`; saldo
  actualizado, ledger balanceado y auditoría registrada.
- M6d: registro → cambio de contraseña → depósito S/ 150.00 → ajuste
  admin de S/ 50.00 (saldo final S/ 200.00). Menú de usuario y `/account`
  revisados.
- M6d checkout: Yape con OTP, tarjeta Visa, transferencia de recarga y retiro
  probados en navegador; el comprobante muestra método y código de operación.
  Los datos de tarjeta/OTP solo viven en el navegador.
- M7 Docker: stack con PostgreSQL + backend + frontend `healthy`; lobby con SSE,
  registro, depósito, checkout, apuesta, historial y admin probados.
- M7 Docker: kit de `dist/betpulse-demo-kit` (365 MB) cargado desde el `.tar` y
  arrancado en `3101` sin instalar Java, Node ni PostgreSQL; reset de base y
  admin sembrado verificados.

## Riesgos

| Riesgo | Mitigación |
|---|---|
| No hay torneo en vivo | Bots o ranked de OpenDota |
| GSI no envía | Revisar `.cfg`, launch option y modo espectador |
| Dota 2 no arranca en la laptop | Probar el setup con antelación |
| El partido no termina | Usar bots y cerrar la partida |
| SSE no actualiza | Verificar proxy y reconexión |
| Stream oficial offline o embed bloqueado | Usar `fallback_url`; probar Twitch/YouTube antes de la demo |
| Steam key ausente | No hace falta para la demo con OpenDota/GSI |

## Checklist

- [x] GSI configurado y probado.
- [x] Fuente principal y respaldo definidos.
- [x] Apuesta y liquidación probadas de punta a punta.
- [x] Admin de mercados y auditoría probados.
- [x] Cuenta, cambio de contraseña y checkout simulado probados.
- [x] Kit Docker probado desde el `.tar` con base limpia.
- [ ] Ensayo completo en la PC de la presentación.
- [ ] Video de respaldo (opcional).
