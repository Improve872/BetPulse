package com.betpulse.wallet;

import java.time.Instant;
import java.util.UUID;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public final class WalletDtos {

	private WalletDtos() {
	}

	public record AmountRequest(
			@NotNull @Min(100) @Max(1_000_000) Long amountCents) {
	}

	public record WalletBalanceResponse(long availableCents, long heldCents, String currency, Instant updatedAt) {
	}

	public record WalletOperationResponse(UUID transactionId, long availableCents, long heldCents, String currency,
			boolean replayed, Instant createdAt) {
	}

	public record WalletTransactionResponse(UUID transactionId, String type, long amountCents, Instant createdAt) {
	}

}
