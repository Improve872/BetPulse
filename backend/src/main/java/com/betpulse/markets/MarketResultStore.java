package com.betpulse.markets;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface MarketResultStore {

	List<ResolvableMarket> findResolvable(int limit);

	void save(ResolvedMarket result);

	Optional<MarketResultRow> find(UUID marketId);

	record ResolvableMarket(UUID marketId, String matchId, String marketKey, BigDecimal line,
			String matchStatus, Boolean radiantWin, Integer radiantScore, Integer direScore,
			Integer durationSeconds, Instant openedAt, String objectivesJson) {
	}

	record ResolvedMarket(UUID marketId, String matchId, String outcome, String winningSelectionKey,
			String detailsJson) {
	}

	record MarketResultRow(UUID marketId, String matchId, String outcome, String winningSelectionKey,
			String resolver, Instant resolvedAt) {
	}

}
