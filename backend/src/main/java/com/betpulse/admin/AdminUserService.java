package com.betpulse.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.betpulse.admin.AdminUserDtos.AdminUserView;
import com.betpulse.wallet.WalletDtos.WalletOperationResponse;
import com.betpulse.wallet.WalletService;

@Service
public class AdminUserService {

	private final JdbcTemplate jdbcTemplate;
	private final WalletService walletService;

	public AdminUserService(JdbcTemplate jdbcTemplate, WalletService walletService) {
		this.jdbcTemplate = jdbcTemplate;
		this.walletService = walletService;
	}

	public List<AdminUserView> search(String query) {
		String normalized = query == null ? "" : query.trim().toLowerCase();
		String pattern = "%" + normalized + "%";
		return jdbcTemplate.query("""
				SELECT u.id, u.email, u.display_name, u.status,
				       COALESCE(w.available_cents, 0) AS available_cents,
				       COALESCE(w.held_cents, 0) AS held_cents,
				       COALESCE(string_agg(r.role_name, ', ' ORDER BY r.role_name), '') AS roles
				FROM users u
				LEFT JOIN wallets w ON w.user_id = u.id
				LEFT JOIN user_roles r ON r.user_id = u.id
				WHERE (? = '' AND u.email NOT LIKE '%@betpulse.test')
				   OR (? <> '' AND (lower(u.email) LIKE ? OR lower(u.display_name) LIKE ?))
				GROUP BY u.id, u.email, u.display_name, u.status, w.available_cents, w.held_cents
				ORDER BY u.created_at DESC
				LIMIT 50
				""", (resultSet, rowNumber) -> new AdminUserView(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("email"),
				resultSet.getString("display_name"),
				resultSet.getString("status"),
				resultSet.getLong("available_cents"),
				resultSet.getLong("held_cents"),
				resultSet.getString("roles")), normalized, normalized, pattern, pattern);
	}

	public WalletOperationResponse adjust(UUID targetUserId, UUID adminUserId, long amountCents, String reason,
			String idempotencyKey) {
		return walletService.adjustByAdmin(targetUserId, adminUserId, amountCents, reason, idempotencyKey);
	}

}
