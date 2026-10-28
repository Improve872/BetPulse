package com.betpulse.markets;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

public final class MarketDtos {

	private MarketDtos() {
	}

	public record SelectionView(String key, String label, BigDecimal probability, BigDecimal odds) {
	}

	public record MarketView(UUID id, String matchId, String marketKey, String marketType, String title, String status,
			int version, String suspensionReason, Instant updatedAt, List<SelectionView> selections) {
	}

	public record LiveMarketsResponse(List<MarketView> markets, Instant updatedAt) {
	}

}
