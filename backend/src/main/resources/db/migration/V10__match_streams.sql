CREATE TABLE match_streams (
    id BIGSERIAL PRIMARY KEY,
    match_id VARCHAR(32),
    league_id BIGINT,
    provider VARCHAR(16) NOT NULL,
    channel_or_video VARCHAR(200) NOT NULL,
    label VARCHAR(120),
    fallback_url VARCHAR(500),
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT match_streams_provider_check CHECK (provider IN ('TWITCH', 'YOUTUBE')),
    CONSTRAINT match_streams_scope_check CHECK ((match_id IS NOT NULL) <> (league_id IS NOT NULL))
);

CREATE UNIQUE INDEX match_streams_match_unique
    ON match_streams (match_id)
    WHERE match_id IS NOT NULL;

CREATE UNIQUE INDEX match_streams_league_unique
    ON match_streams (league_id)
    WHERE league_id IS NOT NULL;

CREATE INDEX match_streams_enabled_idx
    ON match_streams (enabled)
    WHERE enabled;

UPDATE app_metadata
SET meta_value = '10', updated_at = now()
WHERE meta_key = 'schema_version';
