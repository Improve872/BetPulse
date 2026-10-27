# Captura GSI — M0

Herramienta temporal para capturar payloads reales de Dota 2 GSI antes de construir el colector definitivo.

## Requisitos

- Java 21.
- Dota 2 instalado vía Steam.
- Dota 2 cerrado mientras se instala el `.cfg`.

## 1. Instalar el `.cfg` en Dota 2

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\install-gsi-config.ps1
```

Si falla por permisos, abrir PowerShell como administrador y repetir.

Ruta destino:

```text
<Dota 2>\game\dota\cfg\gamestate_integration\gamestate_integration_betpulse.cfg
```

## 2. Activar GSI en Dota 2

En Steam:

1. Biblioteca → Dota 2 → clic derecho → Propiedades.
2. Opciones de lanzamiento.
3. Agregar: `-gamestateintegration`.

## 3. Iniciar la captura

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\gsi-capture\run-capture.ps1
```

Debe mostrar:

```text
Escuchando en http://127.0.0.1:3001/
```

## 4. Probar el receptor sin Dota 2

En otra terminal:

```powershell
$body = '{"provider":{"name":"test"},"auth":{"token":"betpulse-dev-token"},"map":{"matchid":"123","game_state":"DOTA_GAMERULES_STATE_GAME_IN_PROGRESS","game_time":42,"radiant_score":3,"dire_score":1}}'
Invoke-RestMethod -Uri http://127.0.0.1:3001/ -Method Post -ContentType 'application/json' -Body $body
```

Debe responder `ok` y crear `captures/latest.json`.

## 5. Capturar una partida real

1. Abrir Dota 2 con `-gamestateintegration`.
2. Entrar a espectar una partida (DotaTV, amigo o lobby local).
3. Verificar que la terminal muestre líneas con `match=...`.
4. Jugar/observar unos minutos.
5. Detener con `Ctrl+C`.

## Salida

```text
scripts/gsi-capture/captures/
  latest.json              # último payload completo
  gsi-YYYY-MM-DD.jsonl     # un payload por línea
```

No subir `captures/` al repositorio.

## Troubleshooting

- **No llega nada:** confirmar `-gamestateintegration`, que el `.cfg` esté en la carpeta correcta y que Dota 2 esté espectando una partida.
- **401 invalid token:** el token del `.cfg` no coincide con `betpulse-dev-token`.
- **Puerto ocupado:** cerrar el proceso que usa el 3001 o ejecutar `run-capture.ps1 -Port 3002` y actualizar el `.cfg`.
- **No hay carpeta `gamestate_integration`:** crearla manualmente.
- **Dota 2 no genera el archivo:** reiniciar Dota 2 después de instalar el `.cfg`.

## Seguridad

- El receptor escucha solo en `127.0.0.1`.
- El token es de desarrollo; no usar en producción.
- No exponer el puerto a la red.
