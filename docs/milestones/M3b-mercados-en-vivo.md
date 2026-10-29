# M3b — Más mercados en vivo con OpenDota (2026-10-27)

Cerrado funcionalmente.

## Realizado

- Cuatro mercados por partida en vivo: `MATCH_WINNER`, `TOTAL_KILLS`, `KILL_HANDICAP` y `DURATION`.
- Las líneas se fijan al crear el mercado y se guardan en `markets.line`.
- `TOTAL_KILLS`: línea por ritmo esperado de kills y probabilidad Poisson.
- `KILL_HANDICAP`: línea `diferencia actual + 0.5` y probabilidad normal sobre la diferencia final.
- `DURATION`: línea `max(40.5, minuto actual + 5.5)` y supervivencia exponencial.
- Cierre determinista de `TOTAL_KILLS` y `DURATION` cuando el resultado ya no puede cambiar; `CLOSED` no se reabre.
- `GET /api/markets/live` y SSE `markets` devuelven todos los mercados con línea, versión y estado.
- Frontend: contador de mercados por card, listado completo en el modal, etiquetas de over/under y hándicap.
- Tests: `MarketServiceTest` 8, `OddsEngineTest` 7, `MarketControllerTest` 1.

## Exclusiones

- Primera sangre, primera torre y siguiente Roshan quedan para M2b/M5 porque requieren eventos GSI.
