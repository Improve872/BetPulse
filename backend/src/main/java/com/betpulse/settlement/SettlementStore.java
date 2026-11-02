package com.betpulse.settlement;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SettlementStore {

	List<SettleableBet> findSettleable(int limit);

	Optional<SettleableBet> findBet(UUID betId);

	boolean insertSettlement(SettlementRecord settlement);

	void updateBetStatus(UUID betId, String status, String reason);

	void insertAudit(UUID actorUserId, String action, String entityType, String entityId, String detailsJson);

	record SettleableBet(UUID betId, UUID userId, UUID marketId, String matchId, String selectionKey,
			long stakeCents, long potentialPayoutCents, String status, String marketOutcome,
			String winningSelectionKey) {
	}

	record SettlementRecord(UUID betId, UUID marketId, String matchId, String outcome, long stakeCents,
			long payoutCents, UUID ledgerTransactionId, String resolver, Instant resolvedAt) {
	}

}
