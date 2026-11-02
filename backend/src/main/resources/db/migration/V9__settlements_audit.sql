CREATE TABLE settlements (
    bet_id UUID PRIMARY KEY REFERENCES bets(id) ON DELETE RESTRICT,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    match_id VARCHAR(32) NOT NULL,
    outcome VARCHAR(10) NOT NULL,
    stake_cents BIGINT NOT NULL,
    payout_cents BIGINT NOT NULL,
    ledger_transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    resolver VARCHAR(40) NOT NULL,
    resolved_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT settlements_outcome_check CHECK (outcome IN ('WON', 'LOST', 'VOID')),
    CONSTRAINT settlements_stake_positive CHECK (stake_cents > 0),
    CONSTRAINT settlements_payout_nonnegative CHECK (payout_cents >= 0)
);

CREATE INDEX settlements_match_idx ON settlements (match_id);
CREATE INDEX settlements_resolved_idx ON settlements (resolved_at);

CREATE TABLE audit_logs (
    id BIGSERIAL PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(60) NOT NULL,
    entity_type VARCHAR(40) NOT NULL,
    entity_id VARCHAR(80) NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_logs_entity_idx ON audit_logs (entity_type, entity_id);
CREATE INDEX audit_logs_created_idx ON audit_logs (created_at DESC);

CREATE OR REPLACE FUNCTION audit_logs_reject_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_append_only
    BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION audit_logs_reject_mutation();

ALTER TABLE ledger_transactions DROP CONSTRAINT ledger_transactions_type_check;
ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_type_check CHECK (type IN (
    'DEPOSIT', 'WITHDRAWAL', 'BET_HOLD', 'BET_RELEASE', 'BET_WIN', 'BET_LOSS', 'BET_VOID'
));

UPDATE app_metadata
SET meta_value = '9', updated_at = now()
WHERE meta_key = 'schema_version';
