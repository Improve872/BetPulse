# Demo — BetPulse

## Objetivo

Demostrar en clase, en una sola laptop, el flujo completo: partido real de Dota 2 → eventos GSI → cuotas propias actualizándose → apuesta → suspensión/control admin → liquidación → wallet → auditoría.

## Matriz de pruebas de fuentes

| Fuente | Qué evaluar | Riesgo |
|---|---|---|
| DotaTV partido pro | disponibilidad a la hora de clase, ticket, `delay`, datos completos, fin de partida | Depende del calendario |
| Partida de amigo | Dota Plus, delay, estabilidad | Depende de un amigo |
| Lobby local + espectador | segunda cuenta/PC, datos de los 10, duración, poder terminarlo | Setup más complejo |
| Replay GSI real | reproducción acelerada, liquidación | No es en vivo; solo respaldo |

Criterios de decisión:

- Datos completos de los 10 jugadores.
- Estabilidad durante 30 minutos.
- Posibilidad de mostrar una liquidación.
- Tiempo de setup razonable.
- Disponibilidad a la hora de la presentación.

OpenDota `/live` puede informar `is_watch_eligible` y `delay`; usar esos campos para elegir el partido a espectar.

## Decisión

- **Fuente principal:** por definir en M0.
- **Respaldo:** por definir en M0.
- **Contingencia final:** replay de GSI real capturado (no simulación sintética), claramente etiquetado.

## Setup en una sola laptop

1. PostgreSQL en Docker o nativo.
2. Backend, frontend y colector nativos.
3. Dota 2 en modo espectador.
4. Colector escuchando en `localhost`.
5. Navegador con dos perfiles:
   - usuario demo;
   - admin.
6. Segundo monitor si está disponible; si no, alt-tab ensayado.

## Empaquetado para la laptop de presentación

- Probar Docker Compose o stack nativo portable.
- Verificar RAM y arranque.
- Verificar GSI, SSE y persistencia.
- No compilar en vivo.
- Tener el video de respaldo descargado.

## Datos sembrados

- Usuario demo con saldo `S/ 10,000.00`.
- Admin con acceso al panel.
- Trader para suspender mercados.
- Equipos y ratings desde OpenDota.
- Partido en vivo o replay real seleccionado.

## Guion de demo (20–30 min)

| Minuto | Acción |
|---|---|
| 0–3 | Presentar BetPulse, alcance y arquitectura en una diapositiva |
| 3–5 | Login como usuario demo; mostrar wallet en S/ |
| 5–8 | Abrir partido en vivo; mostrar marcador, stream y mercados |
| 8–12 | Mostrar cómo un kill/torre mueve la cuota y suspende el mercado |
| 12–15 | Apostar; mostrar hold y apuesta en historial |
| 15–18 | Cambiar a admin; suspender/reanudar mercado y auditar |
| 18–22 | Mostrar liquidación de una apuesta (partido terminado o cerca del final) |
| 22–25 | Mostrar wallet actualizada, ledger y auditoría |
| 25–30 | Cerrar con arquitectura, seguridad, límites y trabajo futuro |

## Estrategia de liquidación

Es difícil que un partido en vivo termine dentro de la demo. Opciones:

1. Elegir un partido que ya esté cerca del final.
2. Mostrar la liquidación de un partido real ya finalizado, cargado desde OpenDota/GSI replay, claramente etiquetado como “partido real finalizado”.
3. Dejar la liquidación preparada y explicarla con capturas si el partido no termina.

No usar resultados inventados.

## Ensayo

- Ensayar 3 veces con la misma laptop y el mismo setup.
- Medir tiempo de arranque.
- Probar reconexión de SSE.
- Probar caída y recuperación del colector.
- Probar el fallback de replay.
- Grabar video de respaldo de 10–15 minutos.

## Riesgos de demo

| Riesgo | Mitigación |
|---|---|
| No hay partido espectable | Replay real + video de respaldo |
| GSI no envía datos | Verificar `.cfg`, launch option y modo espectador |
| Docker consume RAM | PostgreSQL en Docker, resto nativo |
| SSE no actualiza | Verificar proxy, cookies y reconexión |
| Stream sin internet | Ocultar player y continuar |
| La laptop no rinde | Probar empaquetado nativo; cerrar apps |

## Checklist previo

- [ ] GSI configurado y probado.
- [ ] Fuente principal elegida.
- [ ] Respaldo probado.
- [ ] Usuarios y saldos sembrados.
- [ ] Partido seleccionado.
- [ ] Backend/frontend/colector arrancan sin errores.
- [ ] SSE funciona.
- [ ] Apuesta y liquidación probadas.
- [ ] Admin y auditoría probados.
- [ ] Video de respaldo descargado.
- [ ] Demo ensayada 3 veces.
