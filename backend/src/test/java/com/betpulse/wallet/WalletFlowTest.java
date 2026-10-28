package com.betpulse.wallet;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.betpulse.IntegrationTestBase;
import com.betpulse.shared.error.ApiException;
import com.jayway.jsonpath.JsonPath;

class WalletFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private WalletService walletService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void depositIsIdempotent() throws Exception {
		RegisteredUser user = registerUser();
		String key = "deposit-" + UUID.randomUUID();

		MvcResult first = deposit(user.session(), key, 5000)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(5000))
				.andExpect(jsonPath("$.heldCents").value(0))
				.andExpect(jsonPath("$.replayed").value(false))
				.andReturn();

		String transactionId = JsonPath.read(first.getResponse().getContentAsString(), "$.transactionId");

		MvcResult replay = deposit(user.session(), key, 5000)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(5000))
				.andExpect(jsonPath("$.replayed").value(true))
				.andReturn();

		assertThat((String) JsonPath.read(replay.getResponse().getContentAsString(), "$.transactionId"))
				.isEqualTo(transactionId);

		mockMvc.perform(get("/api/wallet").session(user.session()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(5000));

		Integer transactions = jdbcTemplate.queryForObject("""
				SELECT COUNT(*) FROM ledger_transactions t
				JOIN ledger_entries e ON e.transaction_id = t.id
				JOIN ledger_accounts a ON a.id = e.account_id
				WHERE t.type = 'DEPOSIT' AND a.owner_user_id = ? AND a.account_type = 'USER_AVAILABLE'
				""", Integer.class, user.id());
		assertThat(transactions).isEqualTo(1);
	}

	@Test
	void sameIdempotencyKeyWithDifferentAmountConflicts() throws Exception {
		RegisteredUser user = registerUser();
		String key = "deposit-" + UUID.randomUUID();

		deposit(user.session(), key, 5000).andExpect(status().isOk());

		deposit(user.session(), key, 6000)
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("IDEMPOTENCY_MISMATCH"));

		mockMvc.perform(get("/api/wallet").session(user.session()))
				.andExpect(jsonPath("$.availableCents").value(5000));
	}

	@Test
	void withdrawalRejectsInsufficientFunds() throws Exception {
		RegisteredUser user = registerUser();
		deposit(user.session(), "deposit-" + UUID.randomUUID(), 1000).andExpect(status().isOk());

		mockMvc.perform(post("/api/wallet/withdrawals")
				.session(user.session())
				.with(csrf())
				.header("Idempotency-Key", "withdraw-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"amountCents\":2000}"))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"));

		mockMvc.perform(get("/api/wallet").session(user.session()))
				.andExpect(jsonPath("$.availableCents").value(1000));
	}

	@Test
	void withdrawalMovesFundsAndShowsHistory() throws Exception {
		RegisteredUser user = registerUser();
		deposit(user.session(), "deposit-" + UUID.randomUUID(), 5000).andExpect(status().isOk());

		mockMvc.perform(post("/api/wallet/withdrawals")
				.session(user.session())
				.with(csrf())
				.header("Idempotency-Key", "withdraw-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"amountCents\":1500}"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(3500));

		mockMvc.perform(get("/api/wallet/transactions").session(user.session()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(2))
				.andExpect(jsonPath("$[0].type").value("WITHDRAWAL"))
				.andExpect(jsonPath("$[0].amountCents").value(-1500))
				.andExpect(jsonPath("$[1].type").value("DEPOSIT"))
				.andExpect(jsonPath("$[1].amountCents").value(5000));
	}

	@Test
	void ledgerIsBalancedAndReconciledWithWallet() throws Exception {
		RegisteredUser user = registerUser();
		deposit(user.session(), "deposit-" + UUID.randomUUID(), 7000).andExpect(status().isOk());
		mockMvc.perform(post("/api/wallet/withdrawals")
				.session(user.session())
				.with(csrf())
				.header("Idempotency-Key", "withdraw-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"amountCents\":2500}"))
				.andExpect(status().isOk());

		long walletAvailable = jdbcTemplate.queryForObject(
				"SELECT available_cents FROM wallets WHERE user_id = ?", Long.class, user.id());
		long walletHeld = jdbcTemplate.queryForObject(
				"SELECT held_cents FROM wallets WHERE user_id = ?", Long.class, user.id());
		long accountAvailable = jdbcTemplate.queryForObject("""
				SELECT balance_cents FROM ledger_accounts
				WHERE owner_user_id = ? AND account_type = 'USER_AVAILABLE'
				""", Long.class, user.id());
		long accountHeld = jdbcTemplate.queryForObject("""
				SELECT balance_cents FROM ledger_accounts
				WHERE owner_user_id = ? AND account_type = 'USER_HELD'
				""", Long.class, user.id());

		assertThat(accountAvailable).isEqualTo(walletAvailable);
		assertThat(accountHeld).isEqualTo(walletHeld);
		assertThat(walletAvailable).isEqualTo(4500);

		List<UUID> unbalanced = jdbcTemplate.queryForList("""
				SELECT transaction_id FROM ledger_entries
				GROUP BY transaction_id
				HAVING SUM(amount_cents) <> 0
				""", UUID.class);
		assertThat(unbalanced).isEmpty();

		long globalBalance = jdbcTemplate.queryForObject(
				"SELECT COALESCE(SUM(balance_cents), 0) FROM ledger_accounts", Long.class);
		assertThat(globalBalance).isZero();
	}

	@Test
	void ledgerEntriesAreAppendOnly() throws Exception {
		RegisteredUser user = registerUser();
		deposit(user.session(), "deposit-" + UUID.randomUUID(), 1000).andExpect(status().isOk());

		assertThatThrownBy(() -> jdbcTemplate.update("""
				UPDATE ledger_entries SET amount_cents = 1
				WHERE id = (SELECT id FROM ledger_entries ORDER BY id DESC LIMIT 1)
				""")).isInstanceOf(RuntimeException.class);
	}

	@Test
	void concurrentDepositsDoNotLoseMoney() throws Exception {
		RegisteredUser user = registerUser();
		int deposits = 10;
		long amount = 1000;

		ExecutorService executor = Executors.newFixedThreadPool(deposits);
		CountDownLatch start = new CountDownLatch(1);
		List<Future<?>> futures = new ArrayList<>();
		for (int index = 0; index < deposits; index++) {
			String key = "concurrent-" + UUID.randomUUID();
			futures.add(executor.submit(() -> {
				start.await();
				walletService.deposit(user.id(), amount, key);
				return null;
			}));
		}

		start.countDown();
		for (Future<?> future : futures) {
			future.get(30, TimeUnit.SECONDS);
		}
		executor.shutdown();
		assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

		mockMvc.perform(get("/api/wallet").session(user.session()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(deposits * amount));
	}

	@Test
	void holdsAndReleasesMoveFundsBetweenBuckets() throws Exception {
		RegisteredUser user = registerUser();
		deposit(user.session(), "deposit-" + UUID.randomUUID(), 5000).andExpect(status().isOk());

		walletService.hold(user.id(), 2000, "bet-test");
		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(3000);
		assertThat(walletService.getBalance(user.id()).heldCents()).isEqualTo(2000);

		walletService.release(user.id(), 2000, "bet-test");
		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(5000);
		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();

		assertThatThrownBy(() -> walletService.hold(user.id(), 6000, "bet-too-large"))
				.isInstanceOf(ApiException.class)
				.hasFieldOrPropertyWithValue("code", "INSUFFICIENT_FUNDS");
	}

	private org.springframework.test.web.servlet.ResultActions deposit(MockHttpSession session, String key,
			long amountCents) throws Exception {
		return mockMvc.perform(post("/api/wallet/deposits")
				.session(session)
				.with(csrf())
				.header("Idempotency-Key", key)
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"amountCents\":" + amountCents + "}"));
	}

	private RegisteredUser registerUser() throws Exception {
		String email = "wallet-" + UUID.randomUUID() + "@betpulse.test";
		MvcResult result = mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Wallet User","email":"%s","password":"Secret123","acceptsTerms":true,"isAdult":true}
						""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();

		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		UUID userId = UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.user.id"));
		return new RegisteredUser(userId, session);
	}

	private record RegisteredUser(UUID id, MockHttpSession session) {
	}

}
