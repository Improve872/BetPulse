# M8 — Deportes pre-partida: fútbol y NBA (2026-11-23)

Cerrado. Alcance: ampliar el catálogo sin depender de ver un partido en vivo,
con calendario real, cuotas propias y liquidación. Decisiones: ADR-043,
ADR-044 y ADR-045.

## Realizado

### M8a — Calendario (2026-11-16)

- Cliente ESPN para las cinco grandes ligas (`eng.1`, `esp.1`, `ger.1`,
  `ita.1`, `fra.1`) con `User-Agent` propio.
- `GET /api/sports/fixtures` público; caché en memoria con refresco cada 5 min,
  stale a los 20 min y horizonte de 10 días.
- `/sports` en tema arena: fixtures por liga, filtro, escudos con fallback y
  cuenta atrás. Solo partidos programados.

### M8b — Fútbol apostable (2026-11-23)

- V12: `markets.sport`, `sport_results` y `markets.source='ESPN'`.
- Mercados `MATCH_RESULT_1X2` (local/empate/visitante) y `TOTAL_GOALS` con
  `match_id = 'FB:<eventId>'`.
- Modelo Poisson con goles esperados desde la tabla real de ESPN (ataque,
  defensa, suavizado y ventaja de local); margen 6%, versión y `odds_history`.
- `FootballMarketService` publica cada 5 min y cierra en el kickoff.
  `FootballResultService` ingesta el marcador final por fecha y anula
  postponed/cancelados o sin resultado tras 12 h.
- El backend rechaza apuestas posteriores al kickoff con `MATCH_STARTED`.
- `/sports` muestra cuotas y el boleto reutiliza `BetSlip`.
- Regresión: el cierre por desaparición del feed de Dota no toca mercados de
  fútbol.

### M8c — NBA apostable (2026-11-23)

- V13: `markets.sport` admite `BASKETBALL`.
- Mercados `MATCH_RESULT_2WAY` (local/visitante, sin empate) y `TOTAL_POINTS`
  con `match_id = 'BB:<eventId>'`.
- Modelo normal para margen y total (σ 12 y 18), puntos esperados desde la
  tabla de ESPN por conferencia y ventaja de local 2%. La prórroga cuenta en
  el resultado final.
- `PrematchMarketPublisher` y `PrematchResultService` compartidos con fútbol;
  cada deporte solo aporta líneas, cuotas y etiquetas.
- `/sports` con selector Fútbol/NBA.

## Verificación

- Backend: 139/139 tests (modelos, resoluciones, flujo fútbol y NBA hasta
  settlement, aislamiento Dota/fútbol).
- Frontend: lint, build y 18/18 tests de Vitest.
- Flyway V1–V13 en Testcontainers y PostgreSQL local.
- Funcional con ESPN real: 60 fixtures de fútbol y 21–22 de NBA, todos con dos
  mercados; apuesta por API y por el proxy del frontend con hold correcto.
- CI verde en `750bece`, `ba9891d` y `5467de0`.
- Kit de demo regenerado y probado en limpio.

## Límites de diseño

- No hay cobertura ni apuestas en vivo de fútbol/NBA. El mercado se cierra en
  el kickoff.
- Las cuotas son propias y transparentes; no se comparan con cuotas de mercado.
- Un tercer deporte debería extraer la capa de presentación por deporte a una
  estrategia común.
