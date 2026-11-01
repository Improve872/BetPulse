# Colector GSI — BetPulse

Recibe payloads reales de Dota 2 GSI, los normaliza y los reenvía firmados al
backend. Si el backend no responde, guarda los batches en disco y los reintenta.

## Requisitos

- Java 21.
- Dota 2 con `-gamestateintegration` y el `.cfg` instalado
  (`scripts/install-gsi-config.ps1`).
- Backend BetPulse corriendo (por defecto `http://127.0.0.1:8081`).

## Build

```powershell
.\mvnw.cmd package
```

## Run

```powershell
java -jar target\collector-0.1.0-SNAPSHOT-shaded.jar
```

Escucha en `http://127.0.0.1:3001`:

- `POST /` y `POST /gsi`: recibe GSI, valida token y procesa.
- `GET /health`: estado del colector, cola del spool y último envío.

## Variables

| Variable | Default | Uso |
|---|---|---|
| `GSI_TOKEN` | `betpulse-dev-token` | Token del `.cfg` |
| `BETPULSE_BACKEND_URL` | `http://127.0.0.1:8081` | Backend destino |
| `INGEST_SECRET` | `betpulse-dev-ingest-secret` | Secreto HMAC compartido |
| `INGEST_SPOOL_DIR` | `spool` | Cola de batches pendientes |
| `SNAPSHOT_INTERVAL_MS` | `1000` | Frecuencia de snapshot al backend |
| `GSI_CAPTURE_RAW` | `false` | Guarda además el JSON crudo |
| `GSI_OUT_DIR` | `captures` | Carpeta de captura cruda |

## Qué envía

Cada batch incluye:

- `sessionId`, `snapshotId`, `matchId`, `capturedAt`.
- `clockTime` y `gameTime` (el reloj canónico es `clock_time`).
- Estado, pausa, marcador, `winTeam`, liga.
- Jugadores (10 en espectador, 1 en bots).
- Edificios, Roshan y eventos deduplicados.

Eventos normalizados: `FIRST_BLOOD`, `HERO_KILL`, `TOWER_KILL`, `ROSHAN_KILL`,
`PAUSE`, `UNPAUSE`.

## Reenvío y spool

- Snapshot a 1 Hz y eventos críticos de inmediato.
- Firma `hex(HMAC-SHA256(secret, timestamp + "." + body))` en
  `X-BetPulse-Signature`, con `X-BetPulse-Timestamp`.
- Si el backend falla o responde `>= 300`, el batch va a
  `INGEST_SPOOL_DIR/pending.jsonl` y se reintenta cada 5 s.
- El backend deduplica por `snapshotId` y por `(matchId, eventId)`.

## Captura cruda

Con `GSI_CAPTURE_RAW=true` guarda `gsi-YYYY-MM-DD.jsonl` y `latest.json` en
`GSI_OUT_DIR`. Útil para depurar; desactivado por defecto para no llenar el
disco.

## Prueba rápida

```powershell
$body = '{"provider":{"name":"test"},"auth":{"token":"betpulse-dev-token"},"map":{"matchid":"123","game_state":"DOTA_GAMERULES_STATE_GAME_IN_PROGRESS","game_time":42,"clock_time":42,"paused":false,"radiant_score":3,"dire_score":1}}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/ -Method Post -ContentType 'application/json' -Body $body
```

Debe responder `ok`. El batch normalizado aparecerá en el backend
(`/internal/ingest`) y, si el jugador existe, en el lobby como `source=GSI`.

## Seguridad

- Escucha solo en `127.0.0.1`.
- Token y secreto son de desarrollo; no usar los valores por defecto en producción.
- No exponer el puerto a la red.
