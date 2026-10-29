package com.betpulse.betting;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
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
import com.betpulse.betting.BetDtos.BetView;
import com.betpulse.betting.BetDtos.PlaceBetRequest;
import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.LobbyDtos.LobbyTeam;
import com.betpulse.markets.MarketService;
import com.betpulse.wallet.WalletService;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jayway.jsonpath.JsonPath;

class BetFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private BetService betService;

	@Autowired
	private MarketService marketService;

	@Autowired
	private WalletService walletService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private ObjectMapper objectMapper;

	@Test
	void placesBetAndHoldsStake() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);

		mockMvc.perform(post("/api/bets")
				.session(user.session())
				.with(csrf())
				.header("Idempotency-Key", "bet-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content(body(market, "RADIANT", 1_000, market.radiantOdds(), market.version())))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.status").value("PLACED"))
				.andExpect(jsonPath("$.stakeCents").value(1000))
				.andExpect(jsonPath("$.selectionKey").value("RADIANT"))
				.andExpect(jsonPath("$.replayed").value(false));

		mockMvc.perform(get("/api/wallet").session(user.session()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(9000))
				.andExpect(jsonPath("$.heldCents").value(1000));

		Integer bets = jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bets WHERE user_id = ?",
				Integer.class, user.id());
		Integer history = jdbcTemplate.queryForObject("""
				SELECT COUNT(*) FROM bet_status_history h
				JOIN bets b ON b.id = h.bet_id
				WHERE b.user_id = ?
				""", Integer.class, user.id());
		assertThat(bets).isEqualTo(1);
		assertThat(history).isEqualTo(1);

		Integer ledgerBalance = jdbcTemplate.queryForObject("""
				SELECT COALESCE(SUM(e.amount_cents), 0)
				FROM ledger_entries e
				JOIN ledger_transactions t ON t.id = e.transaction_id
				WHERE t.type = 'BET_HOLD' AND t.created_by = ?
				""", Integer.class, user.id());
		assertThat(ledgerBalance).isZero();
	}

	@Test
	void replayReturnsSameBetWithoutSecondHold() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);
		String key = "bet-" + UUID.randomUUID();
		String request = body(market, "RADIANT", 1_000, market.radiantOdds(), market.version());

		MvcResult first = place(user, key, request)
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.replayed").value(false))
				.andReturn();
		String betId = JsonPath.read(first.getResponse().getContentAsString(), "$.id");

		MvcResult replay = place(user, key, request)
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.replayed").value(true))
				.andReturn();
		String replayId = JsonPath.read(replay.getResponse().getContentAsString(), "$.id");

		assertThat(replayId).isEqualTo(betId);
		assertThat(walletService.getBalance(user.id()).heldCents()).isEqualTo(1_000);
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bets WHERE user_id = ?",
				Integer.class, user.id())).isEqualTo(1);
	}

	@Test
	void sameKeyWithDifferentStakeConflicts() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);
		String key = "bet-" + UUID.randomUUID();

		place(user, key, body(market, "RADIANT", 1_000, market.radiantOdds(), market.version()))
				.andExpect(status().isCreated());

		place(user, key, body(market, "RADIANT", 2_000, market.radiantOdds(), market.version()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("IDEMPOTENCY_MISMATCH"));

		assertThat(walletService.getBalance(user.id()).heldCents()).isEqualTo(1_000);
	}

	@Test
	void rejectsStaleVersionAndOdds() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);

		place(user, "bet-" + UUID.randomUUID(),
				body(market, "RADIANT", 1_000, market.radiantOdds(), market.version() + 1))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("MARKET_VERSION_CHANGED"));

		place(user, "bet-" + UUID.randomUUID(),
				body(market, "RADIANT", 1_000, new BigDecimal("9.999"), market.version()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("ODDS_CHANGED"));

		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();
	}

	@Test
	void rejectsClosedMarketAndInsufficientFunds() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 500, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);

		place(user, "bet-" + UUID.randomUUID(),
				body(market, "RADIANT", 1_000, market.radiantOdds(), market.version()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("INSUFFICIENT_FUNDS"));

		jdbcTemplate.update("UPDATE markets SET status = 'SUSPENDED' WHERE id = ?", market.id());

		place(user, "bet-" + UUID.randomUUID(),
				body(market, "RADIANT", 100, market.radiantOdds(), market.version()))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("MARKET_NOT_OPEN"));

		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(500);
		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();
	}

	@Test
	void rejectsPayoutAboveConfiguredLimit() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 100_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(0, 50);

		place(user, "bet-" + UUID.randomUUID(),
				body(market, "RADIANT", 100_000, market.radiantOdds(), market.version()))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("MAX_PAYOUT_EXCEEDED"));

		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();
	}

	@Test
	void betHistoryIsPrivateToTheUser() throws Exception {
		RegisteredUser owner = registerUser();
		RegisteredUser other = registerUser();
		walletService.deposit(owner.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);

		MvcResult result = place(owner, "bet-" + UUID.randomUUID(),
				body(market, "RADIANT", 1_000, market.radiantOdds(), market.version()))
				.andExpect(status().isCreated())
				.andReturn();
		String betId = JsonPath.read(result.getResponse().getContentAsString(), "$.id");

		mockMvc.perform(get("/api/bets").session(other.session()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.length()").value(0));

		mockMvc.perform(get("/api/bets/{id}", betId).session(other.session()))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.code").value("BET_NOT_FOUND"));
	}

	@Test
	void concurrentSameKeyCreatesOneBet() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);
		PlaceBetRequest request = new PlaceBetRequest(market.id(), "RADIANT", 1_000L, market.radiantOdds(),
				market.version());
		String key = "bet-" + UUID.randomUUID();

		ExecutorService executor = Executors.newFixedThreadPool(2);
		CountDownLatch start = new CountDownLatch(1);
		List<Future<BetView>> futures = new ArrayList<>();
		for (int index = 0; index < 2; index++) {
			futures.add(executor.submit(() -> {
				start.await();
				return betService.place(user.id(), request, key);
			}));
		}
		start.countDown();
		BetView first = futures.get(0).get(30, TimeUnit.SECONDS);
		BetView second = futures.get(1).get(30, TimeUnit.SECONDS);
		executor.shutdown();
		assertThat(executor.awaitTermination(10, TimeUnit.SECONDS)).isTrue();

		assertThat(first.id()).isEqualTo(second.id());
		assertThat(walletService.getBalance(user.id()).heldCents()).isEqualTo(1_000);
		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bets WHERE user_id = ?",
				Integer.class, user.id())).isEqualTo(1);
	}

	@Test
	void bettingRequiresAuthenticationAndCsrf() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000, "deposit-" + UUID.randomUUID());
		MarketInfo market = createMarket(12, 8);
		String request = body(market, "RADIANT", 1_000, market.radiantOdds(), market.version());

		mockMvc.perform(post("/api/bets")
				.with(csrf())
				.header("Idempotency-Key", "bet-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andExpect(status().isUnauthorized());

		mockMvc.perform(post("/api/bets")
				.session(user.session())
				.header("Idempotency-Key", "bet-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content(request))
				.andExpect(status().isForbidden());
	}

	private org.springframework.test.web.servlet.ResultActions place(RegisteredUser user, String key, String body)
			throws Exception {
		return mockMvc.perform(post("/api/bets")
				.session(user.session())
				.with(csrf())
				.header("Idempotency-Key", key)
				.contentType(MediaType.APPLICATION_JSON)
				.content(body));
	}

	private String body(MarketInfo market, String selectionKey, long stakeCents, BigDecimal odds, int version)
			throws Exception {
		return objectMapper.writeValueAsString(new PlaceBetRequest(market.id(), selectionKey, stakeCents, odds, version));
	}

	private MarketInfo createMarket(int radiantKills, int direKills) {
		String matchId = "bet-" + UUID.randomUUID().toString().substring(0, 20);
		marketService.sync(lobby(matchId, radiantKills, direKills));
		UUID marketId = jdbcTemplate.queryForObject("""
				SELECT id FROM markets WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", UUID.class, matchId);
		Integer version = jdbcTemplate.queryForObject("""
				SELECT version FROM markets WHERE id = ?
				""", Integer.class, marketId);
		BigDecimal odds = jdbcTemplate.queryForObject("""
				SELECT odds FROM selections WHERE market_id = ? AND selection_key = 'RADIANT'
				""", BigDecimal.class, marketId);
		return new MarketInfo(marketId, matchId, version, odds);
	}

	private RegisteredUser registerUser() throws Exception {
		String email = "bet-" + UUID.randomUUID() + "@betpulse.test";
		MvcResult result = mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Bet User","email":"%s","password":"Secret123","acceptsTerms":true,"isAdult":true}
						""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();

		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		UUID userId = UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.user.id"));
		return new RegisteredUser(userId, session);
	}

	private static LobbyResponse lobby(String matchId, int radiantKills, int direKills) {
		Instant now = Instant.parse("2026-10-27T12:00:00Z");
		List<LobbyMatch> live = List.of(new LobbyMatch(matchId, "dota2", "live", "Test League", "pro", "BO3",
				now.getEpochSecond(), 1200,
				new LobbyTeam("Team Radiant", radiantKills, "radiant", null),
				new LobbyTeam("Team Dire", direKills, "dire", null),
				7000, 500, 120));
		return new LobbyResponse(live, List.of(), now,
				new FeedHealth("OPENDOTA", "LIVE", now, now, now.plusSeconds(30), 0, null, false));
	}

	private record RegisteredUser(UUID id, MockHttpSession session) {
	}

	private record MarketInfo(UUID id, String matchId, int version, BigDecimal radiantOdds) {
	}

}
