ALTER TABLE markets ADD COLUMN source VARCHAR(20) NOT NULL DEFAULT 'OPENDOTA';
ALTER TABLE markets ADD COLUMN practice BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE markets ADD CONSTRAINT markets_source_check CHECK (source IN ('OPENDOTA', 'GSI'));

UPDATE app_metadata
SET meta_value = '8', updated_at = now()
WHERE meta_key = 'schema_version';
