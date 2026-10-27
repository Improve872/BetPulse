# Colector GSI — BetPulse

Recibe payloads reales de Dota 2 GSI, los guarda y sirve como base para el colector definitivo.

## Requisitos

- Java 21.
- Dota 2 con `-gamestateintegration`.
- El `.cfg` instalado con `scripts/install-gsi-config.ps1`.

## Build

```powershell
.\mvnw.cmd package
```

## Run

```powershell
java -jar target\collector-0.1.0-SNAPSHOT.jar
```

Escucha en `http://127.0.0.1:3001`:

- `POST /gsi`: recibe GSI.
- `GET /health`: responde `ok`.

## Variables

| Variable | Default | Uso |
|---|---|---|
| `GSI_TOKEN` | `betpulse-dev-token` | Token del `.cfg` |
| `GSI_OUT_DIR` | `captures` | Carpeta de salida |

## Salida

```text
captures/
  latest.json
  gsi-YYYY-MM-DD.jsonl
```

## Prueba rápida

```powershell
$body = '{"provider":{"name":"test"},"auth":{"token":"betpulse-dev-token"},"map":{"matchid":"123","game_state":"DOTA_GAMERULES_STATE_GAME_IN_PROGRESS","game_time":42,"radiant_score":3,"dire_score":1}}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/gsi -Method Post -ContentType 'application/json' -Body $body
```

## Siguiente paso

Reenviar los payloads al backend por HTTP firmado y persistir `game_events` en PostgreSQL.
