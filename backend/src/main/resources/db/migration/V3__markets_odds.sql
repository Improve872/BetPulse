CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    match_id VARCHAR(32) NOT NULL,
    market_key VARCHAR(60) NOT NULL,
    market_type VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    line NUMERIC(10, 3),
    status VARCHAR(20) NOT NULL DEFAULT 'SCHEDULED',
    version INTEGER NOT NULL DEFAULT 0,
    suspension_reason VARCHAR(80),
    suspended_at TIMESTAMPTZ,
    opened_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT markets_match_key_unique UNIQUE (match_id, market_key),
    CONSTRAINT markets_status_check CHECK (status IN (
        'SCHEDULED', 'OPEN', 'SUSPENDED', 'CLOSED', 'SETTLED', 'VOID'
    )),
    CONSTRAINT markets_version_nonnegative CHECK (version >= 0)
);

CREATE INDEX markets_match_idx ON markets (match_id);
CREATE INDEX markets_status_idx ON markets (status);

CREATE TABLE selections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    selection_key VARCHAR(40) NOT NULL,
    label VARCHAR(80) NOT NULL,
    probability NUMERIC(12, 8) NOT NULL,
    odds NUMERIC(8, 3) NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT selections_market_key_unique UNIQUE (market_id, selection_key),
    CONSTRAINT selections_probability_check CHECK (probability > 0 AND probability < 1),
    CONSTRAINT selections_odds_check CHECK (odds >= 1.001)
);

CREATE TABLE odds_history (
    id BIGSERIAL PRIMARY KEY,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    version INTEGER NOT NULL,
    selection_key VARCHAR(40) NOT NULL,
    probability NUMERIC(12, 8) NOT NULL,
    odds NUMERIC(8, 3) NOT NULL,
    source VARCHAR(40) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT odds_history_market_version_key UNIQUE (market_id, version, selection_key)
);

CREATE INDEX odds_history_market_idx ON odds_history (market_id, version);

CREATE OR REPLACE FUNCTION odds_history_reject_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'odds_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER odds_history_append_only
    BEFORE UPDATE OR DELETE ON odds_history
    FOR EACH ROW
    EXECUTE FUNCTION odds_history_reject_mutation();

UPDATE app_metadata
SET meta_value = '3', updated_at = now()
WHERE meta_key = 'schema_version';
