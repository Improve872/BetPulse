-- M8b: mercados pre-partida de fútbol (1X2 y total de goles) y su resultado
-- final. El settlement sigue siendo agnóstico a la fuente: este esquema solo
-- alimenta market_results.

ALTER TABLE markets ADD COLUMN sport VARCHAR(20) NOT NULL DEFAULT 'DOTA';

ALTER TABLE markets ADD CONSTRAINT markets_sport_check
    CHECK (sport IN ('DOTA', 'SOCCER'));

ALTER TABLE markets DROP CONSTRAINT markets_source_check;
ALTER TABLE markets ADD CONSTRAINT markets_source_check
    CHECK (source IN ('OPENDOTA', 'GSI', 'ESPN'));

CREATE INDEX markets_sport_status_idx ON markets (sport, status);

-- Resultado final de un partido de deporte pre-partida. Una fila por partido,
-- creada al publicar los mercados y completada por el colector de resultados.
CREATE TABLE sport_results (
    match_id VARCHAR(64) PRIMARY KEY,
    sport VARCHAR(20) NOT NULL,
    league_slug VARCHAR(40) NOT NULL,
    event_id VARCHAR(40) NOT NULL,
    kickoff_at TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    home_score INTEGER,
    away_score INTEGER,
    winner VARCHAR(10),
    detail VARCHAR(120),
    source VARCHAR(20) NOT NULL DEFAULT 'ESPN',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT sport_results_status_check CHECK (status IN ('PENDING', 'READY', 'VOID')),
    CONSTRAINT sport_results_winner_check CHECK (winner IS NULL OR winner IN ('HOME', 'DRAW', 'AWAY')),
    CONSTRAINT sport_results_attempts_nonnegative CHECK (attempts >= 0),
    CONSTRAINT sport_results_ready_fields_check CHECK (
        status <> 'READY' OR (home_score IS NOT NULL AND away_score IS NOT NULL AND winner IS NOT NULL)
    )
);

CREATE INDEX sport_results_pending_idx ON sport_results (status, kickoff_at);
CREATE INDEX sport_results_league_idx ON sport_results (league_slug, event_id);

UPDATE app_metadata
SET meta_value = '12', updated_at = now()
WHERE meta_key = 'schema_version';
