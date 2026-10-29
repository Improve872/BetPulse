CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    match_id VARCHAR(32) NOT NULL,
    market_type VARCHAR(40) NOT NULL,
    market_title VARCHAR(120) NOT NULL,
    line NUMERIC(10, 3),
    selection_key VARCHAR(40) NOT NULL,
    selection_label VARCHAR(80) NOT NULL,
    market_version INTEGER NOT NULL,
    odds NUMERIC(8, 3) NOT NULL,
    stake_cents BIGINT NOT NULL,
    potential_payout_cents BIGINT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PLACED',
    idempotency_key VARCHAR(100) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    hold_transaction_id UUID REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bets_user_idempotency_unique UNIQUE (user_id, idempotency_key),
    CONSTRAINT bets_status_check CHECK (status IN (
        'PLACED', 'WON', 'LOST', 'VOID', 'NEEDS_REVIEW'
    )),
    CONSTRAINT bets_market_version_nonnegative CHECK (market_version >= 0),
    CONSTRAINT bets_odds_check CHECK (odds >= 1.001),
    CONSTRAINT bets_stake_positive CHECK (stake_cents > 0),
    CONSTRAINT bets_payout_check CHECK (potential_payout_cents >= stake_cents)
);

CREATE INDEX bets_user_created_idx ON bets (user_id, created_at DESC);
CREATE INDEX bets_market_idx ON bets (market_id);

CREATE TABLE bet_status_history (
    id BIGSERIAL PRIMARY KEY,
    bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL,
    reason VARCHAR(120),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT bet_status_history_status_check CHECK (status IN (
        'PLACED', 'WON', 'LOST', 'VOID', 'NEEDS_REVIEW'
    ))
);

CREATE INDEX bet_status_history_bet_idx ON bet_status_history (bet_id, created_at);

CREATE OR REPLACE FUNCTION bet_status_history_reject_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'bet_status_history is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER bet_status_history_append_only
    BEFORE UPDATE OR DELETE ON bet_status_history
    FOR EACH ROW
    EXECUTE FUNCTION bet_status_history_reject_mutation();

UPDATE app_metadata
SET meta_value = '4', updated_at = now()
WHERE meta_key = 'schema_version';
