# M2b — Partida propia GSI (2026-11-01)

Cerrado. Tests en `IngestFlowTest`, `MarketServiceTest`,
`MarketOutcomeResolverTest` y `MatchResultFlowTest`.

## Realizado

- Colector definitivo: normalización GSI, dedupe de eventos, snapshot 1 Hz,
  HMAC-SHA256 y spool en disco ante caídas del backend.
- Backend `POST /internal/ingest` con firma, ventana de 5 minutos e
  idempotencia (`snapshot_id`, `UNIQUE (match_id, event_id)`).
- V7: `collector_sessions`, `game_snapshots`, `game_events`,
  `ingestion_health`.
- La partida GSI entra al lobby como `source=GSI`, con `playersScope=FULL|LOCAL`,
  pausa y disponibilidad de Roshan; gana sobre OpenDota si coincide `match_id`.
- Sección "Mi partida" con estado GSI, etiqueta de práctica y enlace a
  `/match/[id]`.
- Mercados `FIRST_BLOOD`, `FIRST_TOWER` y `NEXT_ROSHAN` con cuotas 50/50, cierre
  por evento y Roshan solo en espectador.
- `GET /api/matches/{id}` y SSE `/api/matches/{id}/stream` con marcador,
  jugadores, net worth, timeline y Roshan.
- Suspensión por eventos críticos (`EVENT_SUSPENSION`, 3 s) y por pausa
  (`MATCH_PAUSED`).
- Cierre con gracia de 120 s (`betpulse.markets.close-grace`) ante
  desaparición transitoria del feed.
- `POST_GAME` guarda `match_results` desde GSI con todos los `game_events` como
  objetivos.
- V8: `markets.source` y `markets.practice`; stake máximo S/ 100 en práctica.
- Fixtures GSI reales en `backend/src/test/resources/gsi/` con manifiesto.

## Fuera de alcance

- Draft en vivo (no fue necesario para los mercados).
- Verificación externa de partidas con bots.
- Panel admin de mercados (suspender/reanudar/override).
