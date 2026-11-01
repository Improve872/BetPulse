CREATE TABLE collector_sessions (
    id UUID PRIMARY KEY,
    source VARCHAR(20) NOT NULL DEFAULT 'GSI',
    match_id VARCHAR(32),
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT collector_sessions_source_check CHECK (source IN ('GSI'))
);

CREATE TABLE game_snapshots (
    id BIGSERIAL PRIMARY KEY,
    snapshot_id UUID NOT NULL,
    session_id UUID NOT NULL REFERENCES collector_sessions(id) ON DELETE RESTRICT,
    match_id VARCHAR(32) NOT NULL,
    captured_at TIMESTAMPTZ NOT NULL,
    clock_time INTEGER NOT NULL,
    game_time INTEGER NOT NULL,
    game_state VARCHAR(60) NOT NULL,
    paused BOOLEAN NOT NULL,
    radiant_score INTEGER NOT NULL,
    dire_score INTEGER NOT NULL,
    win_team VARCHAR(20),
    league_id BIGINT,
    league_name VARCHAR(160),
    players JSONB NOT NULL DEFAULT '[]'::jsonb,
    buildings JSONB NOT NULL DEFAULT '[]'::jsonb,
    roshan JSONB,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT game_snapshots_snapshot_unique UNIQUE (snapshot_id)
);

CREATE INDEX game_snapshots_match_idx ON game_snapshots (match_id, clock_time DESC);
CREATE INDEX game_snapshots_captured_idx ON game_snapshots (captured_at DESC);

CREATE TABLE game_events (
    id BIGSERIAL PRIMARY KEY,
    match_id VARCHAR(32) NOT NULL,
    event_id VARCHAR(160) NOT NULL,
    event_type VARCHAR(40) NOT NULL,
    clock_time INTEGER NOT NULL,
    team VARCHAR(20),
    payload JSONB,
    received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT game_events_match_event_unique UNIQUE (match_id, event_id)
);

CREATE INDEX game_events_match_idx ON game_events (match_id, clock_time);

CREATE TABLE ingestion_health (
    session_id UUID PRIMARY KEY REFERENCES collector_sessions(id) ON DELETE RESTRICT,
    last_snapshot_at TIMESTAMPTZ,
    last_event_at TIMESTAMPTZ,
    snapshots_received BIGINT NOT NULL DEFAULT 0,
    events_received BIGINT NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

UPDATE app_metadata
SET meta_value = '7', updated_at = now()
WHERE meta_key = 'schema_version';
