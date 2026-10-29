package com.betpulse.betting;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.betting.BetDtos.BetView;
import com.betpulse.betting.BetDtos.PlaceBetRequest;
import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletService;

@Service
public class BetService {

	private static final String PLACED = "PLACED";
	private static final String OPEN = "OPEN";

	private final JdbcTemplate jdbcTemplate;
	private final WalletService walletService;
	private final BettingProperties properties;

	public BetService(JdbcTemplate jdbcTemplate, WalletService walletService, BettingProperties properties) {
		this.jdbcTemplate = jdbcTemplate;
		this.walletService = walletService;
		this.properties = properties;
	}

	@Transactional
	public BetView place(UUID userId, PlaceBetRequest request, String idempotencyKey) {
		String key = normalizeKey(idempotencyKey);
		String selectionKey = request.selectionKey().trim().toUpperCase(Locale.ROOT);
		long stakeCents = request.stakeCents();
		validateStake(stakeCents);
		String normalizedOdds = request.expectedOdds().setScale(3, RoundingMode.HALF_UP).toPlainString();
		String requestHash = hash(request.marketId() + "|" + selectionKey + "|" + stakeCents + "|"
				+ normalizedOdds + "|" + request.marketVersion());

		Optional<BetRecord> replay = findReplay(userId, key);
		if (replay.isPresent()) {
			return replay.get().view(verifyReplay(replay.get(), requestHash));
		}

		MarketSelection market = lockMarketSelection(request.marketId(), selectionKey);
		validateMarket(market, request);
		long potentialPayoutCents = potentialPayout(stakeCents, market.odds());
		if (potentialPayoutCents > properties.getMaxPayoutCents()) {
			throw ApiException.badRequest("MAX_PAYOUT_EXCEEDED",
					"El payout potencial supera el máximo permitido.");
		}

		UUID betId = UUID.randomUUID();
		int inserted = jdbcTemplate.update("""
				INSERT INTO bets (id, user_id, market_id, match_id, market_type, market_title, line, selection_key,
				                  selection_label, market_version, odds, stake_cents, potential_payout_cents, status,
				                  idempotency_key, request_hash)
				VALUES (?, ?, ?, ?, ?, ?, CAST(? AS NUMERIC), ?, ?, ?, ?, ?, ?, ?, ?, ?)
				ON CONFLICT (user_id, idempotency_key) DO NOTHING
				""", betId, userId, market.marketId(), market.matchId(), market.marketType(), market.marketTitle(),
				market.line(), market.selectionKey(), market.selectionLabel(), market.version(), market.odds(),
				stakeCents, potentialPayoutCents, PLACED, key, requestHash);
		if (inserted == 0) {
			BetRecord concurrent = findReplay(userId, key)
					.orElseThrow(() -> ApiException.conflict("IDEMPOTENCY_IN_PROGRESS",
							"La operación con esa clave todavía está en curso."));
			return concurrent.view(verifyReplay(concurrent, requestHash));
		}

		UUID holdTransactionId = walletService.hold(userId, stakeCents, "bet:" + betId);
		jdbcTemplate.update("""
				UPDATE bets SET hold_transaction_id = ?, updated_at = now()
				WHERE id = ?
				""", holdTransactionId, betId);
		jdbcTemplate.update("""
				INSERT INTO bet_status_history (bet_id, status, reason)
				VALUES (?, ?, ?)
				""", betId, PLACED, "Apuesta creada");

		return findById(betId, userId)
				.orElseThrow(() -> new IllegalStateException("La apuesta recién creada no existe."))
				.view(false);
	}

	@Transactional(readOnly = true)
	public List<BetView> list(UUID userId, int limit) {
		int safeLimit = Math.max(1, Math.min(limit, 100));
		return jdbcTemplate.query("""
				SELECT id, market_id, match_id, market_type, market_title, line, selection_key, selection_label,
				       market_version, odds, stake_cents, potential_payout_cents, status, idempotency_key,
				       request_hash, created_at
				FROM bets
				WHERE user_id = ?
				ORDER BY created_at DESC, id DESC
				LIMIT ?
				""", (resultSet, rowNumber) -> mapBet(resultSet).view(false), userId, safeLimit);
	}

	@Transactional(readOnly = true)
	public BetView get(UUID userId, UUID betId) {
		return findById(betId, userId)
				.orElseThrow(() -> ApiException.notFound("BET_NOT_FOUND", "La apuesta no existe."))
				.view(false);
	}

	private Optional<BetRecord> findById(UUID betId, UUID userId) {
		List<BetRecord> rows = jdbcTemplate.query("""
				SELECT id, market_id, match_id, market_type, market_title, line, selection_key, selection_label,
				       market_version, odds, stake_cents, potential_payout_cents, status, idempotency_key,
				       request_hash, created_at
				FROM bets
				WHERE id = ? AND user_id = ?
				""", (resultSet, rowNumber) -> mapBet(resultSet), betId, userId);
		return rows.stream().findFirst();
	}

	private Optional<BetRecord> findReplay(UUID userId, String key) {
		List<BetRecord> rows = jdbcTemplate.query("""
				SELECT id, market_id, match_id, market_type, market_title, line, selection_key, selection_label,
				       market_version, odds, stake_cents, potential_payout_cents, status, idempotency_key,
				       request_hash, created_at
				FROM bets
				WHERE user_id = ? AND idempotency_key = ?
				""", (resultSet, rowNumber) -> mapBet(resultSet), userId, key);
		return rows.stream().findFirst();
	}

	private MarketSelection lockMarketSelection(UUID marketId, String selectionKey) {
		try {
			return jdbcTemplate.queryForObject("""
					SELECT m.id AS market_id, m.match_id, m.market_type, m.title AS market_title, m.line,
					       m.status, m.version, s.selection_key, s.label AS selection_label, s.odds
					FROM markets m
					JOIN selections s ON s.market_id = m.id
					WHERE m.id = ? AND s.selection_key = ?
					FOR SHARE OF m, s
					""", (resultSet, rowNumber) -> new MarketSelection(
					resultSet.getObject("market_id", UUID.class),
					resultSet.getString("match_id"),
					resultSet.getString("market_type"),
					resultSet.getString("market_title"),
					resultSet.getBigDecimal("line"),
					resultSet.getString("status"),
					resultSet.getInt("version"),
					resultSet.getString("selection_key"),
					resultSet.getString("selection_label"),
					resultSet.getBigDecimal("odds")), marketId, selectionKey);
		} catch (EmptyResultDataAccessException exception) {
			throw ApiException.notFound("MARKET_NOT_FOUND", "El mercado o la selección no existe.");
		}
	}

	private static void validateMarket(MarketSelection market, PlaceBetRequest request) {
		if (!OPEN.equals(market.status())) {
			throw ApiException.conflict("MARKET_NOT_OPEN", "El mercado no está abierto para apuestas.");
		}
		if (market.version() != request.marketVersion()) {
			throw ApiException.conflict("MARKET_VERSION_CHANGED",
					"La versión del mercado cambió. Actualiza las cuotas e intenta de nuevo.");
		}
		if (market.odds().compareTo(request.expectedOdds()) != 0) {
			throw ApiException.conflict("ODDS_CHANGED",
					"La cuota cambió. Actualiza las cuotas e intenta de nuevo.");
		}
	}

	private long potentialPayout(long stakeCents, BigDecimal odds) {
		try {
			return BigDecimal.valueOf(stakeCents)
					.multiply(odds)
					.setScale(0, RoundingMode.HALF_UP)
					.longValueExact();
		} catch (ArithmeticException exception) {
			throw ApiException.badRequest("INVALID_PAYOUT", "No se pudo calcular el pago potencial.");
		}
	}

	private void validateStake(long stakeCents) {
		if (stakeCents < properties.getMinStakeCents() || stakeCents > properties.getMaxStakeCents()) {
			throw ApiException.badRequest("INVALID_STAKE",
					"El stake debe estar entre S/ 1.00 y S/ 1,000.00.");
		}
	}

	private boolean verifyReplay(BetRecord bet, String requestHash) {
		if (!bet.requestHash().equals(requestHash)) {
			throw ApiException.conflict("IDEMPOTENCY_MISMATCH",
					"Esa clave de idempotencia ya se usó con otros datos.");
		}
		return true;
	}

	private String normalizeKey(String idempotencyKey) {
		if (idempotencyKey == null || idempotencyKey.isBlank()) {
			throw ApiException.badRequest("MISSING_IDEMPOTENCY_KEY", "Falta la clave de idempotencia.");
		}
		String key = idempotencyKey.trim();
		if (key.length() > 100) {
			throw ApiException.badRequest("INVALID_IDEMPOTENCY_KEY",
					"La clave de idempotencia no puede superar 100 caracteres.");
		}
		return key;
	}

	private String hash(String value) {
		try {
			MessageDigest digest = MessageDigest.getInstance("SHA-256");
			return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
		} catch (NoSuchAlgorithmException exception) {
			throw new IllegalStateException("SHA-256 is not available", exception);
		}
	}

	private static BetRecord mapBet(ResultSet resultSet) throws SQLException {
		return new BetRecord(
				resultSet.getObject("id", UUID.class),
				resultSet.getObject("market_id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("market_type"),
				resultSet.getString("market_title"),
				resultSet.getBigDecimal("line"),
				resultSet.getString("selection_key"),
				resultSet.getString("selection_label"),
				resultSet.getInt("market_version"),
				resultSet.getBigDecimal("odds"),
				resultSet.getLong("stake_cents"),
				resultSet.getLong("potential_payout_cents"),
				resultSet.getString("status"),
				resultSet.getString("request_hash"),
				resultSet.getTimestamp("created_at").toInstant());
	}

	private record MarketSelection(UUID marketId, String matchId, String marketType, String marketTitle,
			BigDecimal line, String status, int version, String selectionKey, String selectionLabel, BigDecimal odds) {
	}

	private record BetRecord(UUID id, UUID marketId, String matchId, String marketType, String marketTitle,
			BigDecimal line, String selectionKey, String selectionLabel, int marketVersion, BigDecimal odds,
			long stakeCents, long potentialPayoutCents, String status, String requestHash, Instant createdAt) {

		private BetView view(boolean replayed) {
			return new BetView(id, marketId, matchId, marketType, marketTitle, line, selectionKey, selectionLabel,
					marketVersion, odds, stakeCents, potentialPayoutCents, status, replayed, createdAt);
		}
	}

}
