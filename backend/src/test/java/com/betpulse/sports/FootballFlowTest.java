package com.betpulse.sports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.UUID;

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
import com.betpulse.markets.MarketResultService;
import com.betpulse.settlement.SettlementService;
import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletService;
import com.jayway.jsonpath.JsonPath;

class FootballFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private BetService betService;

	@Autowired
	private MarketResultService marketResultService;

	@Autowired
	private SettlementService settlementService;

	@Autowired
	private WalletService walletService;

	@Test
	void settlesPrematchBetWithFinalScore() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000L, "deposit-" + UUID.randomUUID());
		FootballMarket market = createMarket(Instant.now().plusSeconds(3_600), "2.100");
		BetView bet = betService.place(user.id(),
				new PlaceBetRequest(market.marketId(), "HOME", 1_000L, new BigDecimal("2.100"), market.version()),
				"football-bet-" + UUID.randomUUID());

		jdbcTemplate.update("""
				UPDATE sport_results
				SET status = 'READY', home_score = 2, away_score = 1, winner = 'HOME', detail = 'FT',
				    resolved_at = now()
				WHERE match_id = ?
				""", market.matchId());

		marketResultService.runOnce();

		String winningSelection = jdbcTemplate.queryForObject("""
				SELECT winning_selection_key FROM market_results WHERE market_id = ?
				""", String.class, market.marketId());
		assertThat(winningSelection).isEqualTo("HOME");
		assertThat(marketStatus(market.marketId())).isEqualTo("SETTLED");

		assertThat(settlementService.settleOne(bet.id())).isTrue();
		assertThat(betStatus(bet.id())).isEqualTo("WON");
		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();
		assertThat(walletService.getBalance(user.id()).availableCents())
				.isEqualTo(9_000 + bet.potentialPayoutCents());
	}

	@Test
	void voidedFixtureRefundsStake() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 5_000L, "deposit-" + UUID.randomUUID());
		FootballMarket market = createMarket(Instant.now().plusSeconds(3_600), "1.900");
		BetView bet = betService.place(user.id(),
				new PlaceBetRequest(market.marketId(), "HOME", 1_000L, new BigDecimal("1.900"), market.version()),
				"football-bet-" + UUID.randomUUID());

		jdbcTemplate.update("""
				UPDATE sport_results SET status = 'VOID', detail = 'POSTPONED', resolved_at = now()
				WHERE match_id = ?
				""", market.matchId());

		marketResultService.runOnce();

		assertThat(jdbcTemplate.queryForObject(
				"SELECT outcome FROM market_results WHERE market_id = ?", String.class, market.marketId()))
				.isEqualTo("VOID");
		assertThat(settlementService.settleOne(bet.id())).isTrue();
		assertThat(betStatus(bet.id())).isEqualTo("VOID");
		assertThat(walletService.getBalance(user.id()).availableCents()).isEqualTo(5_000);
	}

	@Test
	void rejectsBetAfterKickoffEvenIfMarketIsStillOpen() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 5_000L, "deposit-" + UUID.randomUUID());
		FootballMarket market = createMarket(Instant.now().minusSeconds(60), "2.000");

		assertThatThrownBy(() -> betService.place(user.id(),
				new PlaceBetRequest(market.marketId(), "HOME", 1_000L, new BigDecimal("2.000"), market.version()),
				"football-bet-" + UUID.randomUUID()))
				.isInstanceOf(ApiException.class)
				.hasMessageContaining("comenzó");

		assertThat(jdbcTemplate.queryForObject("SELECT COUNT(*) FROM bets WHERE user_id = ?", Integer.class,
				user.id())).isZero();
	}

	private FootballMarket createMarket(Instant kickoff, String homeOdds) {
		String matchId = "FB:test-" + UUID.randomUUID().toString().substring(0, 18);
		String eventId = matchId.substring(3);
		jdbcTemplate.update("""
				INSERT INTO sport_results (match_id, sport, league_slug, event_id, kickoff_at)
				VALUES (?, 'SOCCER', 'eng.1', ?, ?)
				""", matchId, eventId, Timestamp.from(kickoff));
		UUID marketId = jdbcTemplate.queryForObject("""
				INSERT INTO markets (match_id, market_key, market_type, title, status, source, practice, sport,
				    opened_at)
				VALUES (?, 'MATCH_RESULT_1X2', 'MATCH_RESULT_1X2', 'Resultado (1X2)', 'OPEN', 'ESPN', false,
				    'SOCCER', now())
				RETURNING id
				""", UUID.class, matchId);
		insertSelection(marketId, "HOME", "Local", "0.45000000", homeOdds);
		insertSelection(marketId, "DRAW", "Empate", "0.26000000", "3.600");
		insertSelection(marketId, "AWAY", "Visitante", "0.29000000", "3.200");
		Integer version = jdbcTemplate.queryForObject("SELECT version FROM markets WHERE id = ?",
				Integer.class, marketId);
		return new FootballMarket(marketId, matchId, version);
	}

	private void insertSelection(UUID marketId, String key, String label, String probability, String odds) {
		jdbcTemplate.update("""
				INSERT INTO selections (market_id, selection_key, label, probability, odds)
				VALUES (?, ?, ?, CAST(? AS NUMERIC), CAST(? AS NUMERIC))
				""", marketId, key, label, probability, odds);
	}

	private String marketStatus(UUID marketId) {
		return jdbcTemplate.queryForObject("SELECT status FROM markets WHERE id = ?", String.class, marketId);
	}

	private String betStatus(UUID betId) {
		return jdbcTemplate.queryForObject("SELECT status FROM bets WHERE id = ?", String.class, betId);
	}

	private RegisteredUser registerUser() throws Exception {
		String email = "football-" + UUID.randomUUID() + "@betpulse.test";
		MvcResult result = mockMvc.perform(post("/api/auth/register")
						.with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"displayName":"Football User","email":"%s","password":"Secret123","acceptsTerms":true,"isAdult":true}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		UUID userId = UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.user.id"));
		return new RegisteredUser(userId, session);
	}

	private record RegisteredUser(UUID id, MockHttpSession session) {
	}

	private record FootballMarket(UUID marketId, String matchId, int version) {
	}

}
