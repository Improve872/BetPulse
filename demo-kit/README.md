# BetPulse — kit de demo

Demo local con **frontend + backend + PostgreSQL** en Docker. No incluye Dota 2,
GSI ni colector.

## Requisitos

- Windows 10/11 x64.
- Docker Desktop instalado y **abierto** (WSL2 funcionando).
- Internet para que OpenDota alimente el lobby y ESPN el calendario de fútbol
  y NBA.
- Puerto `3000` libre (o usa `-Port 3100`).

## Primera vez

1. Copia esta carpeta a `C:\BetPulseDemo` (no la ejecutes desde el USB).
2. Abre PowerShell en esa carpeta.
3. Ejecuta:

```powershell
powershell -ExecutionPolicy Bypass -File .\start.ps1
```

El script:

- Carga `betpulse-demo-images.tar` si las imágenes no están instaladas.
- Levanta PostgreSQL, backend y frontend.
- Espera a que los tres estén saludables.
- Abre `http://localhost:3000`.

Primer arranque: 30–60 segundos. Los siguientes: 10–15 segundos.

## Credenciales

- Admin: `admin@betpulse.local` / `Admin123!`
- Usuario: regístralo desde la interfaz. No hay usuario demo fijo.

Puedes cambiar el admin en `.env` **antes del primer arranque**. Si la base ya
se creó, el cambio no se aplica hasta hacer `reset.ps1`.

## Flujo sugerido

1. Lobby con partidas en vivo y cuotas.
2. Registro e inicio de sesión.
3. Mi cuenta y cambio de contraseña.
4. Saldo en el header (ojo para ocultarlo).
5. Billetera: tarjeta, Yape/Plin o transferencia; comprobante con nuevo saldo.
6. Detalle de partida, mercados, boleto y apuesta.
7. Mis apuestas.
8. Fútbol y NBA pre-partida: `/sports`, pestañas Fútbol/NBA, cuotas y apuesta.
9. Admin: usuarios, acreditar saldo, mercados, streams.
10. Anular una apuesta para ver el reembolso y la auditoría.

## Comandos

```powershell
# Levantar y abrir el navegador
.\start.ps1

# Usar otro puerto
.\start.ps1 -Port 3100

# Detener conservando datos
.\stop.ps1

# Detener y borrar la base (demo limpia)
.\reset.ps1

# Ver estado y logs
docker compose ps
docker compose logs -f backend
```

## Problemas comunes

- **Docker no está corriendo:** abre Docker Desktop y espera a que diga “Engine running”.
- **Puerto ocupado:** `.\start.ps1 -Port 3100`.
- **No cargan imágenes:** verifica que `betpulse-demo-images.tar` esté junto al `docker-compose.yml`.
- **Lobby vacío:** revisa internet; OpenDota es la fuente de partidas.
- **`/sports` sin cuotas:** espera ~30 s tras arrancar; el backend consulta ESPN
  y publica los mercados en el primer ciclo. Si ESPN está caído, el calendario
  queda vacío o sin cuotas y Dota no se afecta.
- **Sin partidos en `/sports`:** ESPN solo publica partidos programados en los
  próximos 10 días; en fechas sin calendario la página queda vacía.
- **Pantalla de advertencia de Windows:** ejecuta el `.ps1` con `-ExecutionPolicy Bypass` como se indica arriba.

## Alcance de los deportes

Fútbol y NBA son **solo pre-partida**: hay calendario, cuotas y apuestas, pero
no hay cobertura ni apuestas en vivo. Los mercados se cierran en el kickoff.

## Nota

Este kit es para una demo local. No expongas el puerto a internet ni uses
contraseñas reales. Para producción se cambian secretos, HTTPS y el proveedor
de pagos.
