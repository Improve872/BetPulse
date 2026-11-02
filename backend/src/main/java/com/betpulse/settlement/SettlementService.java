package com.betpulse.settlement;

import java.time.Clock;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import com.betpulse.settlement.SettlementStore.SettleableBet;
import com.betpulse.settlement.SettlementStore.SettlementRecord;
import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Liquida apuestas exactamente una vez a partir de un resultado de mercado ya
 * resuelto. No consulta fuentes externas.
 */
@Service
public class SettlementService {

	private static final Logger log = LoggerFactory.getLogger(SettlementService.class);
	private static final int BATCH_SIZE = 50;
	private static final String RESOLVER = "SETTLEMENT_V1";
	private static final String ADMIN_RESOLVER = "ADMIN_VOID";
	private static final String PLACED = "PLACED";
	private static final String WON = "WON";
	private static final String LOST = "LOST";
	private static final String VOID = "VOID";
	private static final String NEEDS_REVIEW = "NEEDS_REVIEW";

	private final SettlementStore store;
	private final WalletService walletService;
	private final ObjectMapper objectMapper;
	private final Clock clock;
	private final TransactionTemplate transactionTemplate;

	public SettlementService(SettlementStore store, WalletService walletService, ObjectMapper objectMapper,
			Clock clock, PlatformTransactionManager transactionManager) {
		this.store = store;
		this.walletService = walletService;
		this.objectMapper = objectMapper;
		this.clock = clock;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
	}

	public int settlePending() {
		List<SettleableBet> bets = store.findSettleable(BATCH_SIZE);
		int settled = 0;
		for (SettleableBet bet : bets) {
			if (settleOne(bet.betId())) {
				settled++;
			}
		}
		return settled;
	}

	public boolean settleOne(UUID betId) {
		Boolean settled = transactionTemplate.execute(status -> settle(betId));
		return Boolean.TRUE.equals(settled);
	}

	private boolean settle(UUID betId) {
		SettleableBet bet = store.findBet(betId)
				.orElseThrow(() -> ApiException.notFound("BET_NOT_FOUND", "La apuesta no existe."));
		if (!PLACED.equals(bet.status()) || bet.marketOutcome() == null) {
			return false;
		}

		String outcome = resolveOutcome(bet);
		long payout = WON.equals(outcome) ? bet.potentialPayoutCents() : VOID.equals(outcome) ? bet.stakeCents() : 0;
		String reference = "bet:" + bet.betId();
		UUID transactionId = switch (outcome) {
			case WON -> walletService.settleWin(bet.userId(), bet.stakeCents(), payout, reference);
			case LOST -> walletService.settleLoss(bet.userId(), bet.stakeCents(), reference);
			default -> walletService.settleVoid(bet.userId(), bet.stakeCents(), reference);
		};

		boolean inserted = store.insertSettlement(new SettlementRecord(bet.betId(), bet.marketId(), bet.matchId(),
				outcome, bet.stakeCents(), payout, transactionId, RESOLVER, clock.instant()));
		if (!inserted) {
			throw new IllegalStateException("La apuesta ya tenía una liquidación");
		}
		store.updateBetStatus(bet.betId(), outcome, "Liquidación automática");
		store.insertAudit(null, "BET_SETTLED", "BET", bet.betId().toString(),
				details(bet, outcome, payout));
		log.info("Apuesta {} liquidada como {} (payout {} céntimos)", bet.betId(), outcome, payout);
		return true;
	}

	public void voidByAdmin(UUID betId, UUID actorUserId, String reason) {
		if (reason == null || reason.isBlank()) {
			throw ApiException.badRequest("REASON_REQUIRED", "El motivo de anulación es obligatorio.");
		}
		transactionTemplate.executeWithoutResult(status -> voidBet(betId, actorUserId, reason.trim()));
	}

	private void voidBet(UUID betId, UUID actorUserId, String reason) {
		SettleableBet bet = store.findBet(betId)
				.orElseThrow(() -> ApiException.notFound("BET_NOT_FOUND", "La apuesta no existe."));
		if (VOID.equals(bet.status())) {
			return;
		}
		if (!PLACED.equals(bet.status()) && !NEEDS_REVIEW.equals(bet.status())) {
			throw ApiException.conflict("BET_NOT_VOIDABLE",
					"Solo se pueden anular apuestas pendientes o en revisión.");
		}

		UUID transactionId = walletService.settleVoid(bet.userId(), bet.stakeCents(), "bet:" + bet.betId());
		boolean inserted = store.insertSettlement(new SettlementRecord(bet.betId(), bet.marketId(), bet.matchId(),
				VOID, bet.stakeCents(), bet.stakeCents(), transactionId, ADMIN_RESOLVER, clock.instant()));
		if (!inserted) {
			throw new IllegalStateException("La apuesta ya tenía una liquidación");
		}
		store.updateBetStatus(bet.betId(), VOID, "Anulación administrativa: " + reason);
		store.insertAudit(actorUserId, "BET_VOIDED", "BET", bet.betId().toString(),
				details(bet, VOID, bet.stakeCents(), reason));
		log.info("Apuesta {} anulada por admin {}", bet.betId(), actorUserId);
	}

	private static String resolveOutcome(SettleableBet bet) {
		if (VOID.equals(bet.marketOutcome())) {
			return VOID;
		}
		return bet.selectionKey().equals(bet.winningSelectionKey()) ? WON : LOST;
	}

	private String details(SettleableBet bet, String outcome, long payout) {
		return details(bet, outcome, payout, null);
	}

	private String details(SettleableBet bet, String outcome, long payout, String reason) {
		Map<String, Object> details = new LinkedHashMap<>();
		details.put("matchId", bet.matchId());
		details.put("marketId", bet.marketId());
		details.put("selectionKey", bet.selectionKey());
		details.put("outcome", outcome);
		details.put("stakeCents", bet.stakeCents());
		details.put("payoutCents", payout);
		details.put("marketOutcome", bet.marketOutcome());
		details.put("winningSelectionKey", bet.winningSelectionKey());
		details.put("settledAt", Instant.now().toString());
		if (reason != null) {
			details.put("reason", reason);
		}
		try {
			return objectMapper.writeValueAsString(details);
		} catch (JsonProcessingException exception) {
			return "{}";
		}
	}

}
