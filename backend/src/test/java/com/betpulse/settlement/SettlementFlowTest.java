package com.betpulse.settlement;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
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
import com.betpulse.betting.BetDtos.BetView;
import com.betpulse.betting.BetDtos.PlaceBetRequest;
import com.betpulse.betting.BetService;
import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.LobbyDtos.LobbyTeam;
import com.betpulse.markets.MarketService;
import com.betpulse.wallet.WalletService;
import com.jayway.jsonpath.JsonPath;

class SettlementFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private BetService betService;

	@Autowired
	private MarketService marketService;

	@Autowired
	private WalletService walletService;

	@Autowired
	private SettlementService settlementService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void settlesWinningBetExactlyOnce() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);
		markMarketResult(market.marketId(), "SETTLED", "RADIANT");

		assertThat(settlementService.settleOne(bet.id())).isTrue();

		var balance = walletService.getBalance(user.id());
		assertThat(balance.availableCents()).isEqualTo(9_000 + bet.potentialPayoutCents());
		assertThat(balance.heldCents()).isZero();
		assertThat(betStatus(bet.id())).isEqualTo("WON");
		assertThat(settlementCount(bet.id())).isEqualTo(1);
		assertThat(ledgerSum(bet.id())).isZero();

		long availableAfter = balance.availableCents();
		assertThat(settlementService.settleOne(bet.id())).isFalse();
		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(availableAfter);
		assertThat(settlementCount(bet.id())).isEqualTo(1);
	}

	@Test
	void settlesLosingBetAndMovesStakeToHouse() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);
		markMarketResult(market.marketId(), "SETTLED", "DIRE");

		assertThat(settlementService.settleOne(bet.id())).isTrue();

		var balance = walletService.getBalance(user.id());
		assertThat(balance.availableCents()).isEqualTo(9_000);
		assertThat(balance.heldCents()).isZero();
		assertThat(betStatus(bet.id())).isEqualTo("LOST");
		assertThat(payout(bet.id())).isZero();
		assertThat(ledgerSum(bet.id())).isZero();
	}

	@Test
	void voidsBetAndRefundsStake() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);
		markMarketResult(market.marketId(), "VOID", null);

		assertThat(settlementService.settleOne(bet.id())).isTrue();

		var balance = walletService.getBalance(user.id());
		assertThat(balance.availableCents()).isEqualTo(10_000);
		assertThat(balance.heldCents()).isZero();
		assertThat(betStatus(bet.id())).isEqualTo("VOID");
		assertThat(payout(bet.id())).isEqualTo(1_000L);
	}

	@Test
	void adminVoidRefundsAndAudits() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);
		UUID adminId = user.id();

		settlementService.voidByAdmin(bet.id(), adminId, "Partido abandonado");

		var balance = walletService.getBalance(user.id());
		assertThat(balance.availableCents()).isEqualTo(10_000);
		assertThat(balance.heldCents()).isZero();
		assertThat(betStatus(bet.id())).isEqualTo("VOID");
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs WHERE action = 'BET_VOIDED' AND entity_id = ?
				""", Integer.class, bet.id().toString())).isEqualTo(1);

		settlementService.voidByAdmin(bet.id(), adminId, "Repetido");
		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(10_000);
		assertThat(settlementCount(bet.id())).isEqualTo(1);
	}

	@Test
	void adminEndpointVoidsBetAndRefunds() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);

		MvcResult login = mockMvc.perform(post("/api/auth/login")
						.with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"email":"admin@betpulse.local","password":"Admin123!"}
								"""))
				.andExpect(status().isOk())
				.andReturn();
		MockHttpSession adminSession = (MockHttpSession) login.getRequest().getSession(false);

		mockMvc.perform(post("/api/admin/bets/{betId}/void", bet.id())
						.session(adminSession)
						.with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"reason":"Partido abandonado"}
								"""))
				.andExpect(status().isNoContent());

		assertThat(betStatus(bet.id())).isEqualTo("VOID");
		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(10_000);
	}

	@Test
	void waitsForMarketResultBeforeSettling() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);

		assertThat(settlementService.settleOne(bet.id())).isFalse();
		assertThat(betStatus(bet.id())).isEqualTo("PLACED");
		assertThat(settlementCount(bet.id())).isZero();
	}

	@Test
	void concurrentSettlementProducesOneSettlement() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket();
		BetView bet = placeBet(user.id(), market, "RADIANT", 1_000);
		markMarketResult(market.marketId(), "SETTLED", "RADIANT");

		ExecutorService executor = Executors.newFixedThreadPool(2);
		CountDownLatch start = new CountDownLatch(1);
		List<Future<Boolean>> futures = List.of(
				executor.submit(() -> {
					start.await();
					return settlementService.settleOne(bet.id());
				}),
				executor.submit(() -> {
					start.await();
					return settlementService.settleOne(bet.id());
				}));
		start.countDown();
		boolean first = futures.get(0).get(30, TimeUnit.SECONDS);
		boolean second = futures.get(1).get(30, TimeUnit.SECONDS);
		executor.shutdown();

		assertThat(first || second).isTrue();
		assertThat(settlementCount(bet.id())).isEqualTo(1);
		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();
		assertThat(ledgerSum(bet.id())).isZero();
	}

	private RegisteredUser registerUser() throws Exception {
		String email = "settle-" + UUID.randomUUID() + "@betpulse.test";
		MvcResult result = mockMvc.perform(post("/api/auth/register")
						.with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"displayName":"Settle User","email":"%s","password":"Secret123","acceptsTerms":true,"isAdult":true}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		UUID userId = UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.user.id"));
		return new RegisteredUser(userId, session);
	}

	private MarketInfo createMarket() {
		String matchId = "settle-" + UUID.randomUUID().toString().substring(0, 18);
		marketService.sync(lobby(matchId));
		UUID marketId = jdbcTemplate.queryForObject("""
				SELECT id FROM markets WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", UUID.class, matchId);
		Integer version = jdbcTemplate.queryForObject("SELECT version FROM markets WHERE id = ?",
				Integer.class, marketId);
		BigDecimal odds = jdbcTemplate.queryForObject("""
				SELECT odds FROM selections WHERE market_id = ? AND selection_key = 'RADIANT'
				""", BigDecimal.class, marketId);
		return new MarketInfo(marketId, matchId, version, odds);
	}

	private BetView placeBet(UUID userId, MarketInfo market, String selection, long stakeCents) {
		return betService.place(userId,
				new PlaceBetRequest(market.marketId(), selection, stakeCents, market.radiantOdds(),
						market.version()),
				"settle-bet-" + UUID.randomUUID());
	}

	private void markMarketResult(UUID marketId, String outcome, String winningSelection) {
		jdbcTemplate.update("""
				INSERT INTO market_results (market_id, match_id, outcome, winning_selection_key, resolver, details)
				VALUES (?, 'settle', ?, ?, 'TEST', '{}'::jsonb)
				""", marketId, outcome, winningSelection);
	}

	private String betStatus(UUID betId) {
		return jdbcTemplate.queryForObject("SELECT status FROM bets WHERE id = ?", String.class, betId);
	}

	private int settlementCount(UUID betId) {
		Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM settlements WHERE bet_id = ?",
				Integer.class, betId);
		return count == null ? 0 : count;
	}

	private long payout(UUID betId) {
		Long payout = jdbcTemplate.queryForObject("SELECT payout_cents FROM settlements WHERE bet_id = ?",
				Long.class, betId);
		return payout == null ? 0 : payout;
	}

	private long ledgerSum(UUID betId) {
		Long sum = jdbcTemplate.queryForObject("""
				SELECT COALESCE(SUM(e.amount_cents), 0)
				FROM ledger_entries e
				JOIN ledger_transactions t ON t.id = e.transaction_id
				WHERE t.reference = ?
				""", Long.class, "bet:" + betId);
		return sum == null ? 0 : sum;
	}

	private static LobbyResponse lobby(String matchId) {
		Instant now = Instant.parse("2026-11-01T12:00:00Z");
		List<LobbyMatch> live = List.of(new LobbyMatch(matchId, "dota2", "live", "Test League", "pro", "BO3",
				now.getEpochSecond(), 1200,
				new LobbyTeam("Team Radiant", 12, "radiant", null),
				new LobbyTeam("Team Dire", 8, "dire", null),
				7000, 500, 120, "OPENDOTA", null, null, null));
		return new LobbyResponse(live, List.of(), now,
				new FeedHealth("OPENDOTA", "LIVE", now, now, now.plusSeconds(30), 0, null, false));
	}

	private record RegisteredUser(UUID id, MockHttpSession session) {
	}

	private record MarketInfo(UUID marketId, String matchId, int version, BigDecimal radiantOdds) {
	}

}
