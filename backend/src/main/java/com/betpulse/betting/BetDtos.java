package com.betpulse.betting;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

public final class BetDtos {

	private BetDtos() {
	}

	public record PlaceBetRequest(
			@NotNull UUID marketId,
			@NotBlank @Size(max = 40) String selectionKey,
			@NotNull @Positive Long stakeCents,
			@NotNull @DecimalMin("1.001") @Digits(integer = 8, fraction = 3) BigDecimal expectedOdds,
			@NotNull @Min(0) Integer marketVersion) {
	}

	public record BetView(UUID id, UUID marketId, String matchId, String marketType, String marketTitle,
			BigDecimal line, String selectionKey, String selectionLabel, int marketVersion, BigDecimal odds,
			long stakeCents, long potentialPayoutCents, String status, boolean replayed, Instant createdAt) {
	}

}
