package com.betpulse.settlement;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class JdbcSettlementStore implements SettlementStore {

	private final JdbcTemplate jdbcTemplate;

	public JdbcSettlementStore(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	@Override
	public List<SettleableBet> findSettleable(int limit) {
		return jdbcTemplate.query("""
				SELECT b.id, b.user_id, b.market_id, b.match_id, b.selection_key, b.stake_cents,
				       b.potential_payout_cents, b.status, mr.outcome AS market_outcome,
				       mr.winning_selection_key
				FROM bets b
				JOIN market_results mr ON mr.market_id = b.market_id
				WHERE b.status = 'PLACED'
				ORDER BY b.created_at, b.id
				LIMIT ?
				""", (resultSet, rowNumber) -> map(resultSet), limit);
	}

	@Override
	public Optional<SettleableBet> findBet(UUID betId) {
		List<SettleableBet> rows = jdbcTemplate.query("""
				SELECT b.id, b.user_id, b.market_id, b.match_id, b.selection_key, b.stake_cents,
				       b.potential_payout_cents, b.status, mr.outcome AS market_outcome,
				       mr.winning_selection_key
				FROM bets b
				LEFT JOIN market_results mr ON mr.market_id = b.market_id
				WHERE b.id = ?
				FOR UPDATE OF b
				""", (resultSet, rowNumber) -> map(resultSet), betId);
		return rows.stream().findFirst();
	}

	@Override
	public boolean insertSettlement(SettlementRecord settlement) {
		int inserted = jdbcTemplate.update("""
				INSERT INTO settlements (bet_id, market_id, match_id, outcome, stake_cents, payout_cents,
				    ledger_transaction_id, resolver, resolved_at)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (bet_id) DO NOTHING
				""", settlement.betId(), settlement.marketId(), settlement.matchId(), settlement.outcome(),
				settlement.stakeCents(), settlement.payoutCents(), settlement.ledgerTransactionId(),
				settlement.resolver(), Timestamp.from(settlement.resolvedAt()));
		return inserted > 0;
	}

	@Override
	public void updateBetStatus(UUID betId, String status, String reason) {
		jdbcTemplate.update("""
				UPDATE bets SET status = ?, updated_at = now() WHERE id = ?
				""", status, betId);
		jdbcTemplate.update("""
				INSERT INTO bet_status_history (bet_id, status, reason) VALUES (?, ?, ?)
				""", betId, status, reason);
	}

	@Override
	public void insertAudit(UUID actorUserId, String action, String entityType, String entityId,
			String detailsJson) {
		jdbcTemplate.update("""
				INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
				VALUES (?, ?, ?, ?, CAST(? AS jsonb))
				""", actorUserId, action, entityType, entityId, detailsJson);
	}

	private static SettleableBet map(java.sql.ResultSet resultSet) throws java.sql.SQLException {
		return new SettleableBet(
				resultSet.getObject("id", UUID.class),
				resultSet.getObject("user_id", UUID.class),
				resultSet.getObject("market_id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("selection_key"),
				resultSet.getLong("stake_cents"),
				resultSet.getLong("potential_payout_cents"),
				resultSet.getString("status"),
				resultSet.getString("market_outcome"),
				resultSet.getString("winning_selection_key"));
	}

}
