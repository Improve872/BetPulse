package com.betpulse.catalog;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Locale;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.betpulse.catalog.LobbyDtos.StreamRef;
import com.betpulse.catalog.StreamDtos.StreamView;
import com.betpulse.shared.error.ApiException;

@Service
public class StreamService {

	private static final String COLUMNS = """
			id, match_id, league_id, provider, channel_or_video, label, fallback_url,
			enabled, updated_at
			""";

	private final JdbcTemplate jdbcTemplate;

	public StreamService(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public StreamRef findRef(String matchId, Long leagueId) {
		if (matchId != null && !matchId.isBlank()) {
			StreamRef matchStream = queryRef("""
					SELECT provider, channel_or_video, label, fallback_url
					FROM match_streams
					WHERE enabled AND match_id = ?
					LIMIT 1
					""", matchId);
			if (matchStream != null) {
				return matchStream;
			}
		}
		if (leagueId != null && leagueId > 0) {
			return queryRef("""
					SELECT provider, channel_or_video, label, fallback_url
					FROM match_streams
					WHERE enabled AND match_id IS NULL AND league_id = ?
					LIMIT 1
					""", leagueId);
		}
		return null;
	}

	public List<StreamView> list() {
		return jdbcTemplate.query("SELECT " + COLUMNS + " FROM match_streams ORDER BY updated_at DESC, id DESC",
				(resultSet, rowNumber) -> view(resultSet));
	}

	public StreamView get(long id) {
		List<StreamView> rows = jdbcTemplate.query("SELECT " + COLUMNS + " FROM match_streams WHERE id = ?",
				(resultSet, rowNumber) -> view(resultSet), id);
		return rows.stream().findFirst()
				.orElseThrow(() -> ApiException.notFound("STREAM_NOT_FOUND", "El stream no existe."));
	}

	public StreamView save(String matchId, Long leagueId, String provider, String channelOrVideo, String label,
			String fallbackUrl, Boolean enabled) {
		String normalizedMatch = normalize(matchId);
		Long normalizedLeague = leagueId != null && leagueId > 0 ? leagueId : null;
		if ((normalizedMatch == null) == (normalizedLeague == null)) {
			throw ApiException.badRequest("STREAM_SCOPE_REQUIRED",
					"Indica una partida o una liga, pero no ambas.");
		}
		String normalizedProvider = provider == null ? "" : provider.trim().toUpperCase(Locale.ROOT);
		if (!normalizedProvider.equals("TWITCH") && !normalizedProvider.equals("YOUTUBE")) {
			throw ApiException.badRequest("STREAM_PROVIDER_INVALID", "El proveedor debe ser TWITCH o YOUTUBE.");
		}
		String normalizedChannel = requireText(channelOrVideo, "STREAM_CHANNEL_REQUIRED",
				"Indica el canal o video del stream.");
		if (normalizedChannel.length() > 200) {
			throw ApiException.badRequest("STREAM_CHANNEL_TOO_LONG", "El canal o video es demasiado largo.");
		}
		String normalizedLabel = trimToNull(label);
		String normalizedFallback = trimToNull(fallbackUrl);
		if (normalizedMatch != null && normalizedMatch.length() > 32) {
			throw ApiException.badRequest("STREAM_MATCH_TOO_LONG", "El match ID es demasiado largo.");
		}
		if (normalizedLabel != null && normalizedLabel.length() > 120) {
			throw ApiException.badRequest("STREAM_LABEL_TOO_LONG", "La etiqueta es demasiado larga.");
		}
		if (normalizedFallback != null && normalizedFallback.length() > 500) {
			throw ApiException.badRequest("STREAM_FALLBACK_TOO_LONG", "La URL de respaldo es demasiado larga.");
		}
		if (normalizedFallback != null && !normalizedFallback.startsWith("http://")
				&& !normalizedFallback.startsWith("https://")) {
			throw ApiException.badRequest("STREAM_FALLBACK_INVALID", "El fallback debe ser una URL HTTP(S).");
		}
		boolean active = enabled == null || enabled;

		if (normalizedMatch != null) {
			return jdbcTemplate.queryForObject("""
					INSERT INTO match_streams (match_id, league_id, provider, channel_or_video, label, fallback_url, enabled)
					VALUES (?, NULL, ?, ?, ?, ?, ?)
					ON CONFLICT (match_id) WHERE match_id IS NOT NULL
					DO UPDATE SET provider = EXCLUDED.provider, channel_or_video = EXCLUDED.channel_or_video,
					    label = EXCLUDED.label, fallback_url = EXCLUDED.fallback_url, enabled = EXCLUDED.enabled,
					    updated_at = now()
					RETURNING %s
					""".formatted(COLUMNS), (resultSet, rowNumber) -> view(resultSet),
					normalizedMatch, normalizedProvider, normalizedChannel, normalizedLabel, normalizedFallback, active);
		}

		return jdbcTemplate.queryForObject("""
				INSERT INTO match_streams (match_id, league_id, provider, channel_or_video, label, fallback_url, enabled)
				VALUES (NULL, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (league_id) WHERE league_id IS NOT NULL
				DO UPDATE SET provider = EXCLUDED.provider, channel_or_video = EXCLUDED.channel_or_video,
				    label = EXCLUDED.label, fallback_url = EXCLUDED.fallback_url, enabled = EXCLUDED.enabled,
				    updated_at = now()
				RETURNING %s
				""".formatted(COLUMNS), (resultSet, rowNumber) -> view(resultSet),
				normalizedLeague, normalizedProvider, normalizedChannel, normalizedLabel, normalizedFallback, active);
	}

	public StreamView setEnabled(long id, boolean enabled) {
		List<StreamView> rows = jdbcTemplate.query("""
				UPDATE match_streams
				SET enabled = ?, updated_at = now()
				WHERE id = ?
				RETURNING %s
				""".formatted(COLUMNS), (resultSet, rowNumber) -> view(resultSet), enabled, id);
		if (rows.isEmpty()) {
			throw ApiException.notFound("STREAM_NOT_FOUND", "El stream no existe.");
		}
		return rows.getFirst();
	}

	public void delete(long id) {
		int deleted = jdbcTemplate.update("DELETE FROM match_streams WHERE id = ?", id);
		if (deleted == 0) {
			throw ApiException.notFound("STREAM_NOT_FOUND", "El stream no existe.");
		}
	}

	private StreamRef queryRef(String sql, Object argument) {
		List<StreamRef> rows = jdbcTemplate.query(sql, (resultSet, rowNumber) -> new StreamRef(
				resultSet.getString("provider"),
				resultSet.getString("channel_or_video"),
				resultSet.getString("label"),
				resultSet.getString("fallback_url")), argument);
		return rows.stream().findFirst().orElse(null);
	}

	private static StreamView view(ResultSet resultSet) throws SQLException {
		return new StreamView(
				resultSet.getLong("id"),
				resultSet.getString("match_id"),
				resultSet.getObject("league_id", Long.class),
				resultSet.getString("provider"),
				resultSet.getString("channel_or_video"),
				resultSet.getString("label"),
				resultSet.getString("fallback_url"),
				resultSet.getBoolean("enabled"),
				resultSet.getTimestamp("updated_at").toInstant());
	}

	private static String requireText(String value, String code, String message) {
		String normalized = trimToNull(value);
		if (normalized == null) {
			throw ApiException.badRequest(code, message);
		}
		return normalized;
	}

	private static String normalize(String value) {
		String normalized = trimToNull(value);
		return normalized == null ? null : normalized;
	}

	private static String trimToNull(String value) {
		if (value == null) {
			return null;
		}
		String trimmed = value.trim();
		return trimmed.isEmpty() ? null : trimmed;
	}

}
