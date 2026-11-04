ALTER TABLE ledger_transactions DROP CONSTRAINT ledger_transactions_type_check;
ALTER TABLE ledger_transactions ADD CONSTRAINT ledger_transactions_type_check CHECK (type IN (
    'DEPOSIT', 'WITHDRAWAL', 'BET_HOLD', 'BET_RELEASE', 'BET_WIN', 'BET_LOSS', 'BET_VOID',
    'ADMIN_ADJUSTMENT'
));

UPDATE app_metadata
SET meta_value = '11', updated_at = now()
WHERE meta_key = 'schema_version';
