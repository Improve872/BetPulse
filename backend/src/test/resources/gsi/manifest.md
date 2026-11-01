# Fixtures GSI reales

Payloads capturados con `scripts/gsi-capture` desde Dota 2 el **2026-11-01**.
No están simulados ni editados: cada archivo es una línea completa del `.jsonl`
original, tal como la envió Dota 2.

## Espectador (DotaTV)

Partida `9072345549`, capturada entre `game_time` 145 y 1503.

| Archivo | `game_time` | Contenido |
|---|---|---|
| `spectator-pre-game.json` | 145 | Fin de `PRE_GAME`; 10 jugadores, `clock_time` negativo |
| `spectator-first-blood.json` | 309 | `CHAT_MESSAGE_FIRSTBLOOD`; marcador 1-0 |
| `spectator-pause.json` | 759 | `paused=true` |
| `spectator-first-tower.json` | 1025 | `dota_goodguys_tower1_top` con `health=0` |
| `spectator-roshan-kill.json` | 1488 | `roshan.alive=false` |

Partida `9072282669`, final de partida:

| Archivo | `game_time` | Contenido |
|---|---|---|
| `spectator-post-game.json` | 2642 | `POST_GAME`, 44-27, `win_team=radiant` |

## Jugando con bots (modo local)

Partida `9072388087`, sin datos en OpenDota. GSI entrega solo el jugador local,
sus edificios y los eventos; no entrega `buildings.dire` ni `roshan`.

| Archivo | Fase | Contenido |
|---|---|---|
| `local-hero-selection.json` | `HERO_SELECTION` | Payload mínimo de selección de héroes |
| `local-pre-game.json` | `PRE_GAME` | Inicio de partida |
| `local-first-blood.json` | `GAME_IN_PROGRESS` | Primera sangre de Dire (0-1) |
| `local-tower-kill.json` | `GAME_IN_PROGRESS` | Evento `CHAT_MESSAGE_TOWER_KILL` |
| `local-post-game.json` | `POST_GAME` | 20-2, `win_team=radiant` |

## Uso

- Tests de normalización, dedupe de eventos y HMAC.
- Verificación de que el colector tolera payloads parciales (bots).
- No se usan en el producto: la demo consume GSI en vivo.

Las capturas crudas completas viven en `scripts/gsi-capture/captures/` y no se
versionan.
