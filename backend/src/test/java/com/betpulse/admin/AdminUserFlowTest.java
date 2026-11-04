package com.betpulse.admin;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.betpulse.IntegrationTestBase;
import com.betpulse.identity.AppUserPrincipal;
import com.betpulse.identity.AuthDtos.RegisterRequest;
import com.betpulse.identity.AuthService;
import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletDtos.WalletOperationResponse;
import com.betpulse.wallet.WalletService;

class AdminUserFlowTest extends IntegrationTestBase {

	@Autowired
	private AuthService authService;

	@Autowired
	private AdminUserService adminUserService;

	@Autowired
	private WalletService walletService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void searchesUsersAndAdjustsBalanceWithLedgerAndAudit() {
		UUID adminId = adminId();
		AppUserPrincipal target = authService.register(new RegisterRequest(
				"Jugador", "target-" + UUID.randomUUID() + "@betpulse.test", "Passw0rd!", true, true));

		WalletOperationResponse credit = adminUserService.adjust(target.getId(), adminId, 10_000,
				"Carga para demo", "admin-credit-1");

		assertThat(credit.availableCents()).isEqualTo(10_000);
		assertThat(credit.heldCents()).isZero();
		assertThat(credit.replayed()).isFalse();
		assertThat(walletService.getBalance(target.getId()).availableCents()).isEqualTo(10_000);
		assertThat(jdbcTemplate.queryForObject("""
				SELECT COALESCE(sum(e.amount_cents), 0)
				FROM ledger_entries e
				WHERE e.transaction_id = ?
				""", Long.class, credit.transactionId())).isZero();
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs
				WHERE action = 'WALLET_ADMIN_ADJUSTMENT' AND entity_id = ?
				""", Integer.class, target.getId().toString())).isEqualTo(1);

		WalletOperationResponse replay = adminUserService.adjust(target.getId(), adminId, 10_000,
				"Carga para demo", "admin-credit-1");
		assertThat(replay.replayed()).isTrue();
		assertThat(replay.availableCents()).isEqualTo(10_000);
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs
				WHERE action = 'WALLET_ADMIN_ADJUSTMENT' AND entity_id = ?
				""", Integer.class, target.getId().toString())).isEqualTo(1);

		WalletOperationResponse debit = adminUserService.adjust(target.getId(), adminId, -4_000,
				"Corrección", "admin-debit-1");
		assertThat(debit.availableCents()).isEqualTo(6_000);
		assertThat(walletService.getBalance(target.getId()).availableCents()).isEqualTo(6_000);

		assertThat(adminUserService.search(target.getEmail()))
				.anySatisfy(user -> {
					assertThat(user.email()).isEqualTo(target.getEmail());
					assertThat(user.availableCents()).isEqualTo(6_000);
					assertThat(user.roles()).contains("USER");
				});
	}

	@Test
	void rejectsDebitAboveAvailableBalance() {
		UUID adminId = adminId();
		AppUserPrincipal target = authService.register(new RegisterRequest(
				"Jugador", "target-" + UUID.randomUUID() + "@betpulse.test", "Passw0rd!", true, true));

		assertThatThrownBy(() -> adminUserService.adjust(target.getId(), adminId, -1_000,
				"Sin saldo", "admin-debit-empty"))
				.isInstanceOf(ApiException.class);
		assertThat(walletService.getBalance(target.getId()).availableCents()).isZero();
	}

	private UUID adminId() {
		return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = 'admin@betpulse.local'",
				UUID.class);
	}

}
