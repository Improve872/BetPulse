# M0 — Captura GSI y decisión de fuentes (2026-11-01)

Cerrado con fixtures reales. La herramienta de captura vive en
`scripts/gsi-capture/`; los fixtures de test, en
`backend/src/test/resources/gsi/`.

## Partidas capturadas

| Partida | Modo | Ventana | Resultado |
|---|---|---|---|
| `9072282669` | DotaTV (espectador) | 31:50–44:02 | 44-27 radiant, `POST_GAME` |
| `9072345549` | DotaTV (espectador) | 2:25–25:03 | primera sangre 1:16, primera torre 17:05, Roshan 24:48, pausa 12:39 |
| `9072388087` | Bots (jugando) | 0:00–7:07 | 20-2 radiant, `POST_GAME` |

## Qué se validó

- Payload GSI real con **10 jugadores** en espectador.
- Primera sangre, primera torre, Roshan, pausa y fin de partida.
- `POST_GAME` con `win_team`.
- `clock_time` como reloj canónico; `game_time` incluye pre-game y no coincide
  con la duración de OpenDota.
- Eventos GSI transitorios y repetidos: hace falta deduplicar.
- Torres detectables por `buildings.*.health`; Roshan por `roshan.alive` y
  `roshan_state_end_seconds`.
- En bots, GSI entrega solo el jugador local y sus edificios; no hay Roshan ni
  10 jugadores.

## Decisión de fuentes

- **DotaTV en vivo:** experiencia completa (10 jugadores, Roshan, timeline).
- **Bots:** partida controlable para primera sangre/torre y final rápido.
- **OpenDota:** catálogo de torneos/ranked, cuotas sin espectar y verificación
  post-partida.
- **Replay:** descartado por producto.
- **Competitivo:** visible desde OpenDota; para eventos al segundo hay que
  espectarlo con GSI.

## Fixtures

`spectator-pre-game`, `spectator-first-blood`, `spectator-first-tower`,
`spectator-pause`, `spectator-roshan-kill`, `spectator-midgame`,
`spectator-post-game`, `local-hero-selection`, `local-pre-game`,
`local-first-blood`, `local-tower-kill`, `local-post-game` y los batches
normalizados `ingest-*`. Manifiesto en `manifest.md`.

## Limitaciones

- No se capturó el draft; se obtiene de `picks_bans` de OpenDota cuando existe.
- Las partidas con bots no existen en OpenDota: su resultado se confía a GSI.
- El modo local no permite mercados de Roshan.
- Las capturas crudas (1,3 GB) quedan fuera de git.
