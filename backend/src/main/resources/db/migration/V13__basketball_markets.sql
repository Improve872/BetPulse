ALTER TABLE markets DROP CONSTRAINT markets_sport_check;
ALTER TABLE markets ADD CONSTRAINT markets_sport_check
    CHECK (sport IN ('DOTA', 'SOCCER', 'BASKETBALL'));

UPDATE app_metadata
SET meta_value = '13', updated_at = now()
WHERE meta_key = 'schema_version';
