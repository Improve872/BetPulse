package com.betpulse.admin;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.identity.AppUserPrincipal;
import com.betpulse.settlement.SettlementService;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/bets")
public class AdminBetController {

	private final SettlementService settlementService;
	private final JdbcTemplate jdbcTemplate;

	public AdminBetController(SettlementService settlementService, JdbcTemplate jdbcTemplate) {
		this.settlementService = settlementService;
		this.jdbcTemplate = jdbcTemplate;
	}

	@GetMapping
	@PreAuthorize("hasRole('ADMIN')")
	public List<AdminBetView> list(@RequestParam(required = false) String status,
			@RequestParam(defaultValue = "50") int limit) {
		int safeLimit = Math.max(1, Math.min(limit, 200));
		if (status == null || status.isBlank()) {
			return jdbcTemplate.query("""
					SELECT b.id, u.email, b.match_id, b.market_title, b.selection_label, b.stake_cents,
					       b.potential_payout_cents, b.status, b.created_at, s.payout_cents, s.resolved_at
					FROM bets b
					JOIN users u ON u.id = b.user_id
					LEFT JOIN settlements s ON s.bet_id = b.id
					ORDER BY b.created_at DESC
					LIMIT ?
					""", (resultSet, rowNumber) -> map(resultSet), safeLimit);
		}
		return jdbcTemplate.query("""
				SELECT b.id, u.email, b.match_id, b.market_title, b.selection_label, b.stake_cents,
				       b.potential_payout_cents, b.status, b.created_at, s.payout_cents, s.resolved_at
				FROM bets b
				JOIN users u ON u.id = b.user_id
				LEFT JOIN settlements s ON s.bet_id = b.id
				WHERE b.status = ?
				ORDER BY b.created_at DESC
				LIMIT ?
				""", (resultSet, rowNumber) -> map(resultSet), status.toUpperCase(), safeLimit);
	}

	private static AdminBetView map(java.sql.ResultSet resultSet) throws java.sql.SQLException {
		return new AdminBetView(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("email"),
				resultSet.getString("match_id"),
				resultSet.getString("market_title"),
				resultSet.getString("selection_label"),
				resultSet.getLong("stake_cents"),
				resultSet.getLong("potential_payout_cents"),
				resultSet.getString("status"),
				resultSet.getTimestamp("created_at").toInstant(),
				resultSet.getObject("payout_cents", Long.class),
				resultSet.getTimestamp("resolved_at") == null ? null
						: resultSet.getTimestamp("resolved_at").toInstant());
	}

	@PostMapping("/{betId}/void")
	@PreAuthorize("hasRole('ADMIN')")
	public ResponseEntity<Void> voidBet(@PathVariable UUID betId, @RequestBody @Valid VoidBetRequest request,
			Authentication authentication) {
		AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
		settlementService.voidByAdmin(betId, principal.getId(), request.reason());
		return ResponseEntity.noContent().build();
	}

	public record VoidBetRequest(@NotBlank @Size(max = 200) String reason) {
	}

	public record AdminBetView(UUID id, String userEmail, String matchId, String marketTitle,
			String selectionLabel, long stakeCents, long potentialPayoutCents, String status, Instant createdAt,
			Long payoutCents, Instant settledAt) {
	}

}
