CREATE TABLE market_results (
    market_id UUID PRIMARY KEY REFERENCES markets(id) ON DELETE RESTRICT,
    match_id VARCHAR(32) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    winning_selection_key VARCHAR(40),
    resolver VARCHAR(40) NOT NULL,
    details JSONB,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT market_results_outcome_check CHECK (outcome IN ('SETTLED', 'VOID')),
    CONSTRAINT market_results_winner_check CHECK (
        (outcome = 'SETTLED' AND winning_selection_key IS NOT NULL)
        OR (outcome = 'VOID' AND winning_selection_key IS NULL)
    )
);

CREATE INDEX market_results_match_idx ON market_results (match_id);

UPDATE app_metadata
SET meta_value = '6', updated_at = now()
WHERE meta_key = 'schema_version';
