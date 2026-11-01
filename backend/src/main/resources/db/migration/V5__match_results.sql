CREATE TABLE match_results (
    match_id VARCHAR(32) PRIMARY KEY,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    radiant_win BOOLEAN,
    radiant_score INTEGER,
    dire_score INTEGER,
    duration_seconds INTEGER,
    first_blood_time INTEGER,
    league_id BIGINT,
    objectives JSONB,
    source VARCHAR(20) NOT NULL DEFAULT 'OPENDOTA',
    attempts INTEGER NOT NULL DEFAULT 0,
    last_attempt_at TIMESTAMPTZ,
    next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    last_error VARCHAR(300),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT match_results_status_check CHECK (status IN (
        'PENDING', 'READY', 'FAILED', 'VOID'
    )),
    CONSTRAINT match_results_attempts_nonnegative CHECK (attempts >= 0),
    CONSTRAINT match_results_ready_fields_check CHECK (
        status <> 'READY' OR (radiant_win IS NOT NULL AND duration_seconds IS NOT NULL)
    )
);

CREATE INDEX match_results_pending_idx ON match_results (status, next_attempt_at);
CREATE INDEX match_results_resolved_idx ON match_results (resolved_at);

UPDATE app_metadata
SET meta_value = '5', updated_at = now()
WHERE meta_key = 'schema_version';
