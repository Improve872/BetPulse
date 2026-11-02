package com.betpulse.markets;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class JdbcMarketResultStore implements MarketResultStore {

	private static final String RESOLVER = "MARKET_RESULT_V1";

	private final JdbcTemplate jdbcTemplate;

	public JdbcMarketResultStore(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@Override
	public List<ResolvableMarket> findResolvable(int limit) {
		return jdbcTemplate.query("""
				SELECT m.id, m.match_id, m.market_key, m.line, m.opened_at,
				       r.status AS match_status, r.radiant_win, r.radiant_score, r.dire_score, r.duration_seconds,
				       r.objectives::text AS objectives_json
				FROM markets m
				JOIN match_results r ON r.match_id = m.match_id
				LEFT JOIN market_results mr ON mr.market_id = m.id
				WHERE r.status IN ('READY', 'VOID')
				  AND mr.market_id IS NULL
				  AND m.status IN ('OPEN', 'SUSPENDED', 'CLOSED')
				ORDER BY m.match_id, m.market_key
				LIMIT ?
				""", (resultSet, rowNumber) -> mapResolvable(resultSet), limit);
	}

	@Override
	@Transactional
	public void save(ResolvedMarket result) {
		int inserted = jdbcTemplate.update("""
				INSERT INTO market_results (market_id, match_id, outcome, winning_selection_key, resolver, details)
				VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
				ON CONFLICT (market_id) DO NOTHING
				""", result.marketId(), result.matchId(), result.outcome(), result.winningSelectionKey(),
				RESOLVER, result.detailsJson());
		if (inserted == 0) {
			return;
		}
		String marketStatus = "VOID".equals(result.outcome()) ? "VOID" : "SETTLED";
		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = NULL, suspended_at = NULL,
				    closed_at = COALESCE(closed_at, now()), updated_at = now()
				WHERE id = ? AND status NOT IN ('SETTLED', 'VOID')
				""", marketStatus, result.marketId());
	}

	@Override
	public Optional<MarketResultRow> find(UUID marketId) {
		List<MarketResultRow> rows = jdbcTemplate.query("""
				SELECT market_id, match_id, outcome, winning_selection_key, resolver, resolved_at
				FROM market_results
				WHERE market_id = ?
				""", (resultSet, rowNumber) -> new MarketResultRow(
				resultSet.getObject("market_id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("outcome"),
				resultSet.getString("winning_selection_key"),
				resultSet.getString("resolver"),
				resultSet.getTimestamp("resolved_at").toInstant()), marketId);
		return rows.stream().findFirst();
	}

	private static ResolvableMarket mapResolvable(ResultSet resultSet) throws SQLException {
		return new ResolvableMarket(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("market_key"),
				resultSet.getBigDecimal("line"),
				resultSet.getString("match_status"),
				resultSet.getObject("radiant_win", Boolean.class),
				resultSet.getObject("radiant_score", Integer.class),
				resultSet.getObject("dire_score", Integer.class),
				resultSet.getObject("duration_seconds", Integer.class),
				resultSet.getTimestamp("opened_at") == null ? null
						: resultSet.getTimestamp("opened_at").toInstant(),
				resultSet.getString("objectives_json"));
	}

}
