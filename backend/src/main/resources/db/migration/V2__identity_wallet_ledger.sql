CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    display_name VARCHAR(80) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_status_check CHECK (status IN ('ACTIVE', 'LOCKED', 'DISABLED'))
);

CREATE TABLE roles (
    name VARCHAR(20) PRIMARY KEY
);

INSERT INTO roles (name) VALUES ('USER'), ('TRADER'), ('ADMIN'), ('AUDITOR');

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_name VARCHAR(20) NOT NULL REFERENCES roles(name),
    PRIMARY KEY (user_id, role_name)
);

CREATE TABLE wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    currency CHAR(3) NOT NULL DEFAULT 'PEN',
    available_cents BIGINT NOT NULL DEFAULT 0,
    held_cents BIGINT NOT NULL DEFAULT 0,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT wallets_available_nonnegative CHECK (available_cents >= 0),
    CONSTRAINT wallets_held_nonnegative CHECK (held_cents >= 0)
);

CREATE TABLE ledger_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(80) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL,
    owner_user_id UUID REFERENCES users(id),
    currency CHAR(3) NOT NULL DEFAULT 'PEN',
    balance_cents BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ledger_accounts_type_check CHECK (account_type IN (
        'USER_AVAILABLE', 'USER_HELD', 'HOUSE', 'HOUSE_REVENUE', 'PENDING_PAYOUT', 'EXTERNAL'
    )),
    CONSTRAINT ledger_accounts_owner_check CHECK (
        (account_type IN ('USER_AVAILABLE', 'USER_HELD') AND owner_user_id IS NOT NULL)
        OR (account_type NOT IN ('USER_AVAILABLE', 'USER_HELD') AND owner_user_id IS NULL)
    )
);

CREATE UNIQUE INDEX ledger_accounts_owner_type_unique
    ON ledger_accounts (owner_user_id, account_type)
    WHERE owner_user_id IS NOT NULL;

INSERT INTO ledger_accounts (code, account_type) VALUES
    ('HOUSE', 'HOUSE'),
    ('HOUSE_REVENUE', 'HOUSE_REVENUE'),
    ('PENDING_PAYOUT', 'PENDING_PAYOUT'),
    ('EXTERNAL', 'EXTERNAL');

CREATE TABLE ledger_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(30) NOT NULL,
    reference VARCHAR(120),
    idempotency_key VARCHAR(100),
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ledger_transactions_type_check CHECK (type IN (
        'DEPOSIT', 'WITHDRAWAL', 'BET_HOLD', 'BET_RELEASE', 'BET_WIN', 'BET_LOSS'
    ))
);

CREATE TABLE ledger_entries (
    id BIGSERIAL PRIMARY KEY,
    transaction_id UUID NOT NULL REFERENCES ledger_transactions(id) ON DELETE RESTRICT,
    account_id UUID NOT NULL REFERENCES ledger_accounts(id) ON DELETE RESTRICT,
    amount_cents BIGINT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ledger_entries_nonzero CHECK (amount_cents <> 0)
);

CREATE INDEX ledger_entries_transaction_idx ON ledger_entries (transaction_id);
CREATE INDEX ledger_entries_account_idx ON ledger_entries (account_id);

CREATE TABLE idempotency_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    scope VARCHAR(30) NOT NULL,
    key VARCHAR(100) NOT NULL,
    request_hash CHAR(64) NOT NULL,
    status VARCHAR(20) NOT NULL,
    response_body JSONB,
    transaction_id UUID REFERENCES ledger_transactions(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT idempotency_keys_unique UNIQUE (user_id, scope, key),
    CONSTRAINT idempotency_keys_status_check CHECK (status IN ('IN_PROGRESS', 'COMPLETED'))
);

CREATE OR REPLACE FUNCTION ledger_update_account_balance() RETURNS TRIGGER AS $$
BEGIN
    UPDATE ledger_accounts
    SET balance_cents = balance_cents + NEW.amount_cents
    WHERE id = NEW.account_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_update_balance
    AFTER INSERT ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION ledger_update_account_balance();

CREATE OR REPLACE FUNCTION ledger_assert_transaction_balanced() RETURNS TRIGGER AS $$
DECLARE
    total BIGINT;
BEGIN
    SELECT COALESCE(SUM(amount_cents), 0)
    INTO total
    FROM ledger_entries
    WHERE transaction_id = NEW.transaction_id;

    IF total <> 0 THEN
        RAISE EXCEPTION 'ledger transaction % is unbalanced: %', NEW.transaction_id, total;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE CONSTRAINT TRIGGER ledger_entries_balanced
    AFTER INSERT ON ledger_entries
    DEFERRABLE INITIALLY DEFERRED
    FOR EACH ROW
    EXECUTE FUNCTION ledger_assert_transaction_balanced();

CREATE OR REPLACE FUNCTION ledger_reject_mutation() RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ledger tables are append-only';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ledger_entries_append_only
    BEFORE UPDATE OR DELETE ON ledger_entries
    FOR EACH ROW
    EXECUTE FUNCTION ledger_reject_mutation();

CREATE TRIGGER ledger_transactions_append_only
    BEFORE UPDATE OR DELETE ON ledger_transactions
    FOR EACH ROW
    EXECUTE FUNCTION ledger_reject_mutation();

UPDATE app_metadata
SET meta_value = '2', updated_at = now()
WHERE meta_key = 'schema_version';
