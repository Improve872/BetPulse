package com.betpulse.wallet;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.Instant;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.springframework.dao.EmptyResultDataAccessException;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletDtos.WalletBalanceResponse;
import com.betpulse.wallet.WalletDtos.WalletOperationResponse;
import com.betpulse.wallet.WalletDtos.WalletTransactionResponse;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class WalletService {

	static final String USER_AVAILABLE = "USER_AVAILABLE";
	static final String USER_HELD = "USER_HELD";
	static final String HOUSE = "HOUSE";
	static final String EXTERNAL = "EXTERNAL";

	static final String SCOPE_DEPOSIT = "WALLET_DEPOSIT";
	static final String SCOPE_WITHDRAWAL = "WALLET_WITHDRAWAL";
	static final String SCOPE_ADMIN_ADJUSTMENT = "ADMIN_ADJUSTMENT";

	private static final long MIN_AMOUNT_CENTS = 100L;
	private static final long MAX_AMOUNT_CENTS = 1_000_000L;

	private final JdbcTemplate jdbcTemplate;
	private final ObjectMapper objectMapper;

	public WalletService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
		this.jdbcTemplate = jdbcTemplate;
		this.objectMapper = objectMapper;
	}

	@Transactional
	public void createWallet(UUID userId) {
		jdbcTemplate.update("""
				INSERT INTO wallets (user_id)
				VALUES (?)
				ON CONFLICT (user_id) DO NOTHING
				""", userId);
		createAccount(userId, USER_AVAILABLE);
		createAccount(userId, USER_HELD);
	}

	@Transactional(readOnly = true)
	public WalletBalanceResponse getBalance(UUID userId) {
		try {
			return jdbcTemplate.queryForObject("""
					SELECT available_cents, held_cents, currency, updated_at
					FROM wallets
					WHERE user_id = ?
					""", (resultSet, rowNumber) -> new WalletBalanceResponse(
					resultSet.getLong("available_cents"),
					resultSet.getLong("held_cents"),
					resultSet.getString("currency"),
					resultSet.getTimestamp("updated_at").toInstant()), userId);
		} catch (EmptyResultDataAccessException exception) {
			throw ApiException.notFound("WALLET_NOT_FOUND", "El usuario no tiene una billetera.");
		}
	}

	@Transactional
	public WalletOperationResponse deposit(UUID userId, long amountCents, String idempotencyKey) {
		validateAmount(amountCents);
		String key = normalizeKey(idempotencyKey);
		String requestHash = hash(SCOPE_DEPOSIT + ":" + amountCents);

		Optional<WalletOperationResponse> replay = findReplay(userId, SCOPE_DEPOSIT, key, requestHash);
		if (replay.isPresent()) {
			return replay.get();
		}

		int inserted = jdbcTemplate.update("""
				INSERT INTO idempotency_keys (user_id, scope, key, request_hash, status)
				VALUES (?, ?, ?, ?, 'IN_PROGRESS')
				ON CONFLICT (user_id, scope, key) DO NOTHING
				""", userId, SCOPE_DEPOSIT, key, requestHash);
		if (inserted == 0) {
			return findReplay(userId, SCOPE_DEPOSIT, key, requestHash)
					.orElseThrow(() -> ApiException.conflict("IDEMPOTENCY_IN_PROGRESS",
							"La operación con esa clave todavía está en curso."));
		}

		WalletBalance balance = lockWallet(userId);
		long newAvailable = Math.addExact(balance.availableCents(), amountCents);
		updateWallet(userId, newAvailable, balance.heldCents());

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "DEPOSIT", "demo-deposit", key, userId);
		insertEntry(transactionId, accountId(USER_AVAILABLE, userId), amountCents);
		insertEntry(transactionId, accountId(EXTERNAL, null), -amountCents);

		WalletOperationResponse response = new WalletOperationResponse(transactionId, newAvailable,
				balance.heldCents(), balance.currency(), false, Instant.now());
		completeIdempotency(userId, SCOPE_DEPOSIT, key, transactionId, response);
		return response;
	}

	@Transactional
	public WalletOperationResponse withdraw(UUID userId, long amountCents, String idempotencyKey) {
		validateAmount(amountCents);
		String key = normalizeKey(idempotencyKey);
		String requestHash = hash(SCOPE_WITHDRAWAL + ":" + amountCents);

		Optional<WalletOperationResponse> replay = findReplay(userId, SCOPE_WITHDRAWAL, key, requestHash);
		if (replay.isPresent()) {
			return replay.get();
		}

		int inserted = jdbcTemplate.update("""
				INSERT INTO idempotency_keys (user_id, scope, key, request_hash, status)
				VALUES (?, ?, ?, ?, 'IN_PROGRESS')
				ON CONFLICT (user_id, scope, key) DO NOTHING
				""", userId, SCOPE_WITHDRAWAL, key, requestHash);
		if (inserted == 0) {
			return findReplay(userId, SCOPE_WITHDRAWAL, key, requestHash)
					.orElseThrow(() -> ApiException.conflict("IDEMPOTENCY_IN_PROGRESS",
							"La operación con esa clave todavía está en curso."));
		}

		WalletBalance balance = lockWallet(userId);
		if (balance.availableCents() < amountCents) {
			throw ApiException.conflict("INSUFFICIENT_FUNDS", "Saldo disponible insuficiente.");
		}
		long newAvailable = Math.subtractExact(balance.availableCents(), amountCents);
		updateWallet(userId, newAvailable, balance.heldCents());

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "WITHDRAWAL", "demo-withdrawal", key, userId);
		insertEntry(transactionId, accountId(USER_AVAILABLE, userId), -amountCents);
		insertEntry(transactionId, accountId(EXTERNAL, null), amountCents);

		WalletOperationResponse response = new WalletOperationResponse(transactionId, newAvailable,
				balance.heldCents(), balance.currency(), false, Instant.now());
		completeIdempotency(userId, SCOPE_WITHDRAWAL, key, transactionId, response);
		return response;
	}

	@Transactional
	public WalletOperationResponse adjustByAdmin(UUID targetUserId, UUID adminUserId, long amountCents,
			String reason, String idempotencyKey) {
		if (amountCents == 0) {
			throw ApiException.badRequest("INVALID_ADJUSTMENT", "El ajuste no puede ser cero.");
		}
		long absoluteAmount;
		try {
			absoluteAmount = Math.absExact(amountCents);
		} catch (ArithmeticException exception) {
			throw ApiException.badRequest("INVALID_ADJUSTMENT", "El monto del ajuste no es válido.");
		}
		validateAmount(absoluteAmount);
		String normalizedReason = reason == null ? "" : reason.trim();
		if (normalizedReason.isEmpty()) {
			throw ApiException.badRequest("MISSING_ADJUSTMENT_REASON", "Indica el motivo del ajuste.");
		}
		if (normalizedReason.length() > 200) {
			throw ApiException.badRequest("ADJUSTMENT_REASON_TOO_LONG",
					"El motivo no puede superar 200 caracteres.");
		}

		String key = normalizeKey(idempotencyKey);
		String requestHash = hash(SCOPE_ADMIN_ADJUSTMENT + ":" + targetUserId + ":" + amountCents + ":"
				+ normalizedReason);

		Optional<WalletOperationResponse> replay = findReplay(targetUserId, SCOPE_ADMIN_ADJUSTMENT, key,
				requestHash);
		if (replay.isPresent()) {
			return replay.get();
		}

		int inserted = jdbcTemplate.update("""
				INSERT INTO idempotency_keys (user_id, scope, key, request_hash, status)
				VALUES (?, ?, ?, ?, 'IN_PROGRESS')
				ON CONFLICT (user_id, scope, key) DO NOTHING
				""", targetUserId, SCOPE_ADMIN_ADJUSTMENT, key, requestHash);
		if (inserted == 0) {
			return findReplay(targetUserId, SCOPE_ADMIN_ADJUSTMENT, key, requestHash)
					.orElseThrow(() -> ApiException.conflict("IDEMPOTENCY_IN_PROGRESS",
							"La operación con esa clave todavía está en curso."));
		}

		WalletBalance balance = lockWallet(targetUserId);
		long newAvailable;
		try {
			newAvailable = Math.addExact(balance.availableCents(), amountCents);
		} catch (ArithmeticException exception) {
			throw ApiException.badRequest("INVALID_ADJUSTMENT", "El ajuste excede el saldo permitido.");
		}
		if (newAvailable < 0) {
			throw ApiException.conflict("INSUFFICIENT_FUNDS", "Saldo disponible insuficiente.");
		}
		updateWallet(targetUserId, newAvailable, balance.heldCents());

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "ADMIN_ADJUSTMENT", "admin-adjustment", key, adminUserId);
		insertEntry(transactionId, accountId(USER_AVAILABLE, targetUserId), amountCents);
		insertEntry(transactionId, accountId(HOUSE, null), -amountCents);
		auditAdminAdjustment(adminUserId, targetUserId, amountCents, normalizedReason, transactionId);

		WalletOperationResponse response = new WalletOperationResponse(transactionId, newAvailable,
				balance.heldCents(), balance.currency(), false, Instant.now());
		completeIdempotency(targetUserId, SCOPE_ADMIN_ADJUSTMENT, key, transactionId, response);
		return response;
	}

	private void auditAdminAdjustment(UUID adminUserId, UUID targetUserId, long amountCents, String reason,
			UUID transactionId) {
		Map<String, Object> details = new LinkedHashMap<>();
		details.put("targetUserId", targetUserId.toString());
		details.put("amountCents", amountCents);
		details.put("reason", reason);
		details.put("transactionId", transactionId.toString());
		try {
			jdbcTemplate.update("""
					INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
					VALUES (?, 'WALLET_ADMIN_ADJUSTMENT', 'WALLET', ?, CAST(? AS jsonb))
					""", adminUserId, targetUserId.toString(),
					objectMapper.writeValueAsString(details));
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("No se pudo serializar la auditoría del ajuste de saldo", exception);
		}
	}

	@Transactional
	public UUID hold(UUID userId, long amountCents, String reference) {
		validateAmount(amountCents);
		WalletBalance balance = lockWallet(userId);
		if (balance.availableCents() < amountCents) {
			throw ApiException.conflict("INSUFFICIENT_FUNDS", "Saldo disponible insuficiente.");
		}
		updateWallet(userId, balance.availableCents() - amountCents, balance.heldCents() + amountCents);

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "BET_HOLD", reference, null, userId);
		insertEntry(transactionId, accountId(USER_AVAILABLE, userId), -amountCents);
		insertEntry(transactionId, accountId(USER_HELD, userId), amountCents);
		return transactionId;
	}

	@Transactional
	public UUID release(UUID userId, long amountCents, String reference) {
		validateAmount(amountCents);
		WalletBalance balance = lockWallet(userId);
		if (balance.heldCents() < amountCents) {
			throw ApiException.conflict("INSUFFICIENT_HELD_FUNDS", "Saldo retenido insuficiente.");
		}
		updateWallet(userId, balance.availableCents() + amountCents, balance.heldCents() - amountCents);

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "BET_RELEASE", reference, null, userId);
		insertEntry(transactionId, accountId(USER_HELD, userId), -amountCents);
		insertEntry(transactionId, accountId(USER_AVAILABLE, userId), amountCents);
		return transactionId;
	}

	@Transactional
	public UUID settleWin(UUID userId, long stakeCents, long payoutCents, String reference) {
		if (stakeCents <= 0 || payoutCents < stakeCents) {
			throw new IllegalArgumentException("Payout inválido para la liquidación");
		}
		WalletBalance balance = lockWallet(userId);
		if (balance.heldCents() < stakeCents) {
			throw ApiException.conflict("INSUFFICIENT_HELD_FUNDS", "Saldo retenido insuficiente.");
		}
		long newHeld = balance.heldCents() - stakeCents;
		long newAvailable = Math.addExact(balance.availableCents(), payoutCents);
		updateWallet(userId, newAvailable, newHeld);

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "BET_WIN", reference, null, userId);
		insertEntry(transactionId, accountId(USER_HELD, userId), -stakeCents);
		insertEntry(transactionId, accountId(USER_AVAILABLE, userId), payoutCents);
		long houseShare = payoutCents - stakeCents;
		if (houseShare != 0) {
			insertEntry(transactionId, accountId(HOUSE, null), -houseShare);
		}
		return transactionId;
	}

	@Transactional
	public UUID settleLoss(UUID userId, long stakeCents, String reference) {
		if (stakeCents <= 0) {
			throw new IllegalArgumentException("Stake inválido para la liquidación");
		}
		WalletBalance balance = lockWallet(userId);
		if (balance.heldCents() < stakeCents) {
			throw ApiException.conflict("INSUFFICIENT_HELD_FUNDS", "Saldo retenido insuficiente.");
		}
		updateWallet(userId, balance.availableCents(), balance.heldCents() - stakeCents);

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "BET_LOSS", reference, null, userId);
		insertEntry(transactionId, accountId(USER_HELD, userId), -stakeCents);
		insertEntry(transactionId, accountId(HOUSE, null), stakeCents);
		return transactionId;
	}

	@Transactional
	public UUID settleVoid(UUID userId, long stakeCents, String reference) {
		if (stakeCents <= 0) {
			throw new IllegalArgumentException("Stake inválido para la liquidación");
		}
		WalletBalance balance = lockWallet(userId);
		if (balance.heldCents() < stakeCents) {
			throw ApiException.conflict("INSUFFICIENT_HELD_FUNDS", "Saldo retenido insuficiente.");
		}
		updateWallet(userId, balance.availableCents() + stakeCents, balance.heldCents() - stakeCents);

		UUID transactionId = UUID.randomUUID();
		insertTransaction(transactionId, "BET_VOID", reference, null, userId);
		insertEntry(transactionId, accountId(USER_HELD, userId), -stakeCents);
		insertEntry(transactionId, accountId(USER_AVAILABLE, userId), stakeCents);
		return transactionId;
	}

	@Transactional(readOnly = true)
	public List<WalletTransactionResponse> listTransactions(UUID userId, int limit) {
		int safeLimit = Math.max(1, Math.min(limit, 100));
		return jdbcTemplate.query("""
				SELECT t.id, t.type, t.created_at, e.amount_cents
				FROM ledger_entries e
				JOIN ledger_transactions t ON t.id = e.transaction_id
				JOIN ledger_accounts a ON a.id = e.account_id
				WHERE a.owner_user_id = ? AND a.account_type = ?
				ORDER BY t.created_at DESC, e.id DESC
				LIMIT ?
				""", (resultSet, rowNumber) -> new WalletTransactionResponse(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("type"),
				resultSet.getLong("amount_cents"),
				resultSet.getTimestamp("created_at").toInstant()), userId, USER_AVAILABLE, safeLimit);
	}

	private void createAccount(UUID userId, String accountType) {
		jdbcTemplate.update("""
				INSERT INTO ledger_accounts (code, account_type, owner_user_id)
				VALUES (?, ?, ?)
				ON CONFLICT (code) DO NOTHING
				""", accountType + ":" + userId, accountType, userId);
	}

	private WalletBalance lockWallet(UUID userId) {
		try {
			return jdbcTemplate.queryForObject("""
					SELECT available_cents, held_cents, currency
					FROM wallets
					WHERE user_id = ?
					FOR UPDATE
					""", (resultSet, rowNumber) -> new WalletBalance(
					resultSet.getLong("available_cents"),
					resultSet.getLong("held_cents"),
					resultSet.getString("currency")), userId);
		} catch (EmptyResultDataAccessException exception) {
			throw ApiException.notFound("WALLET_NOT_FOUND", "El usuario no tiene una billetera.");
		}
	}

	private void updateWallet(UUID userId, long availableCents, long heldCents) {
		int updated = jdbcTemplate.update("""
				UPDATE wallets
				SET available_cents = ?, held_cents = ?, version = version + 1, updated_at = now()
				WHERE user_id = ?
				""", availableCents, heldCents, userId);
		if (updated != 1) {
			throw new IllegalStateException("Wallet update affected " + updated + " rows for user " + userId);
		}
	}

	private UUID accountId(String accountType, UUID ownerUserId) {
		try {
			if (ownerUserId == null) {
				return jdbcTemplate.queryForObject("""
						SELECT id FROM ledger_accounts
						WHERE account_type = ? AND owner_user_id IS NULL
						""", UUID.class, accountType);
			}
			return jdbcTemplate.queryForObject("""
					SELECT id FROM ledger_accounts
					WHERE account_type = ? AND owner_user_id = ?
					""", UUID.class, accountType, ownerUserId);
		} catch (EmptyResultDataAccessException exception) {
			throw new IllegalStateException("Missing ledger account " + accountType + " for owner " + ownerUserId);
		}
	}

	private void insertTransaction(UUID transactionId, String type, String reference, String idempotencyKey,
			UUID createdBy) {
		jdbcTemplate.update("""
				INSERT INTO ledger_transactions (id, type, reference, idempotency_key, created_by)
				VALUES (?, ?, ?, ?, ?)
				""", transactionId, type, reference, idempotencyKey, createdBy);
	}

	private void insertEntry(UUID transactionId, UUID accountId, long amountCents) {
		jdbcTemplate.update("""
				INSERT INTO ledger_entries (transaction_id, account_id, amount_cents)
				VALUES (?, ?, ?)
				""", transactionId, accountId, amountCents);
	}

	private Optional<WalletOperationResponse> findReplay(UUID userId, String scope, String key,
			String requestHash) {
		List<IdempotencyRow> rows = jdbcTemplate.query("""
				SELECT request_hash, status, response_body::text AS response_body
				FROM idempotency_keys
				WHERE user_id = ? AND scope = ? AND key = ?
				""", (resultSet, rowNumber) -> new IdempotencyRow(
				resultSet.getString("request_hash"),
				resultSet.getString("status"),
				resultSet.getString("response_body")), userId, scope, key);

		if (rows.isEmpty()) {
			return Optional.empty();
		}

		IdempotencyRow row = rows.getFirst();
		if (!row.requestHash().equals(requestHash)) {
			throw ApiException.conflict("IDEMPOTENCY_MISMATCH",
					"Esa clave de idempotencia ya se usó con otros datos.");
		}
		if (!"COMPLETED".equals(row.status()) || row.responseBody() == null) {
			throw ApiException.conflict("IDEMPOTENCY_IN_PROGRESS",
					"La operación con esa clave todavía está en curso.");
		}

		try {
			WalletOperationResponse stored = objectMapper.readValue(row.responseBody(),
					WalletOperationResponse.class);
			return Optional.of(new WalletOperationResponse(stored.transactionId(), stored.availableCents(),
					stored.heldCents(), stored.currency(), true, stored.createdAt()));
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("Stored idempotency response is not valid JSON", exception);
		}
	}

	private void completeIdempotency(UUID userId, String scope, String key, UUID transactionId,
			WalletOperationResponse response) {
		try {
			String body = objectMapper.writeValueAsString(response);
			jdbcTemplate.update("""
					UPDATE idempotency_keys
					SET status = 'COMPLETED', response_body = CAST(? AS jsonb), transaction_id = ?, updated_at = now()
					WHERE user_id = ? AND scope = ? AND key = ?
					""", body, transactionId, userId, scope, key);
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("Could not serialize idempotency response", exception);
		}
	}

	private void validateAmount(long amountCents) {
		if (amountCents < MIN_AMOUNT_CENTS || amountCents > MAX_AMOUNT_CENTS) {
			throw ApiException.badRequest("INVALID_AMOUNT",
					"El monto debe estar entre S/ 1.00 y S/ 10,000.00.");
		}
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

	private record WalletBalance(long availableCents, long heldCents, String currency) {
	}

	private record IdempotencyRow(String requestHash, String status, String responseBody) {
	}

}
