package com.betpulse.live;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import com.betpulse.catalog.OpenDotaDtos.MatchDetails;

@Repository
public class JdbcMatchResultStore implements MatchResultStore {

	private static final String SOURCE = "OPENDOTA";

	private final JdbcTemplate jdbcTemplate;

	public JdbcMatchResultStore(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@Override
	public int enqueueClosedMatchesWithoutResult() {
		return jdbcTemplate.update("""
				INSERT INTO match_results (match_id)
				SELECT DISTINCT m.match_id
				FROM markets m
				LEFT JOIN match_results r ON r.match_id = m.match_id
				WHERE m.status = 'CLOSED' AND r.match_id IS NULL
				ON CONFLICT (match_id) DO NOTHING
				""");
	}

	@Override
	public List<PendingResult> findPending(Instant dueAt, int limit) {
		return jdbcTemplate.query("""
				SELECT match_id, attempts
				FROM match_results
				WHERE status = 'PENDING' AND next_attempt_at <= ?
				ORDER BY next_attempt_at, match_id
				LIMIT ?
				""", (resultSet, rowNumber) -> new PendingResult(
				resultSet.getString("match_id"),
				resultSet.getInt("attempts")), timestamp(dueAt), limit);
	}

	@Override
	public Optional<MatchResultRow> find(String matchId) {
		List<MatchResultRow> rows = jdbcTemplate.query("""
				SELECT match_id, status, radiant_win, radiant_score, dire_score, duration_seconds,
				       first_blood_time, league_id, resolved_at, attempts, last_error
				FROM match_results
				WHERE match_id = ?
				""", (resultSet, rowNumber) -> mapRow(resultSet), matchId);
		return rows.stream().findFirst();
	}

	@Override
	public void markReady(String matchId, MatchDetails details, String objectivesJson, Instant now) {
		jdbcTemplate.update("""
				UPDATE match_results
				SET status = 'READY',
				    radiant_win = ?,
				    radiant_score = ?,
				    dire_score = ?,
				    duration_seconds = ?,
				    first_blood_time = ?,
				    league_id = ?,
				    objectives = CAST(? AS jsonb),
				    source = ?,
				    attempts = attempts + 1,
				    last_attempt_at = ?,
				    next_attempt_at = ?,
				    resolved_at = ?,
				    last_error = NULL,
				    updated_at = now()
				WHERE match_id = ?
				""", details.radiantWin(), details.radiantScore(), details.direScore(),
				intValue(details.duration()), intValue(details.firstBloodTime()), details.leagueId(),
				objectivesJson, SOURCE, timestamp(now), timestamp(now), timestamp(now), matchId);
	}

	@Override
	public void markFailure(String matchId, String error, Instant nextAttemptAt, boolean terminal, Instant now) {
		jdbcTemplate.update("""
				UPDATE match_results
				SET status = ?,
				    attempts = attempts + 1,
				    last_attempt_at = ?,
				    next_attempt_at = ?,
				    last_error = ?,
				    updated_at = now()
				WHERE match_id = ?
				""", terminal ? "FAILED" : "PENDING", timestamp(now), timestamp(nextAttemptAt), truncate(error),
				matchId);
	}

	private static MatchResultRow mapRow(ResultSet resultSet) throws SQLException {
		return new MatchResultRow(
				resultSet.getString("match_id"),
				resultSet.getString("status"),
				resultSet.getObject("radiant_win", Boolean.class),
				resultSet.getObject("radiant_score", Integer.class),
				resultSet.getObject("dire_score", Integer.class),
				longValue(resultSet.getObject("duration_seconds", Integer.class)),
				longValue(resultSet.getObject("first_blood_time", Integer.class)),
				resultSet.getObject("league_id", Long.class),
				resultSet.getTimestamp("resolved_at") == null ? null : resultSet.getTimestamp("resolved_at").toInstant(),
				resultSet.getInt("attempts"),
				resultSet.getString("last_error"));
	}

	private static Integer intValue(Long value) {
		return value == null ? null : Math.toIntExact(value);
	}

	private static Long longValue(Integer value) {
		return value == null ? null : value.longValue();
	}

	private static Timestamp timestamp(Instant instant) {
		return instant == null ? null : Timestamp.from(instant);
	}

	private static String truncate(String value) {
		if (value == null) {
			return null;
		}
		return value.length() > 300 ? value.substring(0, 300) : value;
	}

}
