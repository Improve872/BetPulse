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

## Setup

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

En `/admin/streams`, asignar un canal oficial de Twitch o un video de YouTube
a la partida o liga que se mostrará. Sin stream asignado, la UI muestra el
fallback “sin stream oficial”; no se inventa señal.

## Guion (15–20 min)

| Minuto | Acción |
|---|---|
| 0–2 | Presentar BetPulse: apuestas de esports, datos reales y panel administrativo |
| 2–4 | Registro/login, wallet en S/ y admin acreditando saldo desde `/admin/users` |
| 4–6 | Lobby: partido destacado con escudos, tabs, cuotas, boleto y CTA “Ver stream”; abrir el detalle y reproducir el stream oficial |
| 6–9 | "Mi partida": iniciar partida con bots en Dota 2 o entrar a DotaTV |
| 9–12 | Mostrar `/match/[id]`: marcador, stream, mercados, timeline, Roshan y SSE |
| 12–14 | Apostar a primera sangre o primera torre; ver hold y `/bets` |
| 14–16 | Provocar el evento en la partida; el mercado se cierra |
| 16–18 | Terminar la partida o esperar `POST_GAME`; liquidación automática |
| 18–19 | Wallet actualizada, pago, estado `WON/LOST/VOID`, auditoría |
| 19–20 | Admin: ajustar saldo, suspender/reanudar/override de cuota con motivo |

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
- [ ] Ensayo completo en la laptop de presentación.
- [ ] Video de respaldo (opcional).
