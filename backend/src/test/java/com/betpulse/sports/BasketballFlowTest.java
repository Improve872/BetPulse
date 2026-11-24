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

class BasketballFlowTest extends IntegrationTestBase {

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
	void settlesNbaWinnerBetWithFinalScore() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 10_000L, "deposit-" + UUID.randomUUID());
		NbaMarket market = createMarket(Instant.now().plusSeconds(3_600), "1.850");
		BetView bet = betService.place(user.id(),
				new PlaceBetRequest(market.marketId(), "HOME", 1_000L, new BigDecimal("1.850"), market.version()),
				"nba-bet-" + UUID.randomUUID());

		finish(market.matchId(), 112, 104, "HOME");
		marketResultService.runOnce();

		assertThat(jdbcTemplate.queryForObject(
				"SELECT outcome FROM market_results WHERE market_id = ?", String.class, market.marketId()))
				.isEqualTo("SETTLED");
		assertThat(jdbcTemplate.queryForObject(
				"SELECT winning_selection_key FROM market_results WHERE market_id = ?", String.class,
				market.marketId())).isEqualTo("HOME");
		assertThat(settlementService.settleOne(bet.id())).isTrue();
		assertThat(betStatus(bet.id())).isEqualTo("WON");
		assertThat(walletService.getBalance(user.id()).heldCents()).isZero();
		assertThat(walletService.getBalance(user.id()).availableCents())
				.isEqualTo(9_000 + bet.potentialPayoutCents());
	}

	@Test
	void resolvesTotalPointsMarket() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 5_000L, "deposit-" + UUID.randomUUID());
		NbaMarket market = createMarket(Instant.now().plusSeconds(3_600), "1.950");
		BetView bet = betService.place(user.id(),
				new PlaceBetRequest(market.marketId(), "HOME", 500L, new BigDecimal("1.950"), market.version()),
				"nba-bet-" + UUID.randomUUID());
		finish(market.matchId(), 120, 118, "HOME");

		UUID totalsMarket = jdbcTemplate.queryForObject("""
				INSERT INTO markets (match_id, market_key, market_type, title, line, status, source, practice, sport,
				    opened_at)
				VALUES (?, 'TOTAL_POINTS', 'TOTAL_POINTS', 'Total de puntos', 220.5, 'OPEN', 'ESPN', false,
				    'BASKETBALL', now())
				RETURNING id
				""", UUID.class, market.matchId());
		jdbcTemplate.update("""
				INSERT INTO selections (market_id, selection_key, label, probability, odds)
				VALUES (?, 'OVER', 'Más de 220.5', 0.55, 1.710), (?, 'UNDER', 'Menos de 220.5', 0.45, 2.090)
				""", totalsMarket, totalsMarket);

		marketResultService.runOnce();

		assertThat(jdbcTemplate.queryForObject("""
				SELECT winning_selection_key FROM market_results WHERE market_id = ?
				""", String.class, totalsMarket)).isEqualTo("OVER");
		assertThat(settlementService.settleOne(bet.id())).isTrue();
	}

	@Test
	void rejectsNbaBetAfterTipOff() throws Exception {
		RegisteredUser user = registerUser();
		walletService.deposit(user.id(), 5_000L, "deposit-" + UUID.randomUUID());
		NbaMarket market = createMarket(Instant.now().minusSeconds(60), "2.000");

		assertThatThrownBy(() -> betService.place(user.id(),
				new PlaceBetRequest(market.marketId(), "HOME", 1_000L, new BigDecimal("2.000"), market.version()),
				"nba-bet-" + UUID.randomUUID()))
				.isInstanceOf(ApiException.class)
				.hasMessageContaining("comenzó");
	}

	private NbaMarket createMarket(Instant kickoff, String homeOdds) {
		String matchId = "BB:test-" + UUID.randomUUID().toString().substring(0, 18);
		jdbcTemplate.update("""
				INSERT INTO sport_results (match_id, sport, league_slug, event_id, kickoff_at)
				VALUES (?, 'BASKETBALL', 'nba', ?, ?)
				""", matchId, matchId.substring(3), Timestamp.from(kickoff));
		UUID marketId = jdbcTemplate.queryForObject("""
				INSERT INTO markets (match_id, market_key, market_type, title, status, source, practice, sport,
				    opened_at)
				VALUES (?, 'MATCH_RESULT_2WAY', 'MATCH_RESULT_2WAY', 'Ganador', 'OPEN', 'ESPN', false,
				    'BASKETBALL', now())
				RETURNING id
				""", UUID.class, matchId);
		jdbcTemplate.update("""
				INSERT INTO selections (market_id, selection_key, label, probability, odds)
				VALUES (?, 'HOME', 'Local', 0.54000000, CAST(? AS NUMERIC)),
				       (?, 'AWAY', 'Visitante', 0.46000000, '2.176')
				""", marketId, homeOdds, marketId);
		Integer version = jdbcTemplate.queryForObject("SELECT version FROM markets WHERE id = ?",
				Integer.class, marketId);
		return new NbaMarket(marketId, matchId, version);
	}

	private void finish(String matchId, int home, int away, String winner) {
		jdbcTemplate.update("""
				UPDATE sport_results
				SET status = 'READY', home_score = ?, away_score = ?, winner = ?, detail = 'FINAL',
				    resolved_at = now()
				WHERE match_id = ?
				""", home, away, winner, matchId);
	}

	private String betStatus(UUID betId) {
		return jdbcTemplate.queryForObject("SELECT status FROM bets WHERE id = ?", String.class, betId);
	}

	private RegisteredUser registerUser() throws Exception {
		String email = "nba-" + UUID.randomUUID() + "@betpulse.test";
		MvcResult result = mockMvc.perform(post("/api/auth/register")
						.with(csrf())
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{"displayName":"NBA User","email":"%s","password":"Secret123","acceptsTerms":true,"isAdult":true}
								""".formatted(email)))
				.andExpect(status().isCreated())
				.andReturn();
		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);
		UUID userId = UUID.fromString(JsonPath.read(result.getResponse().getContentAsString(), "$.user.id"));
		return new RegisteredUser(userId, session);
	}

	private record RegisteredUser(UUID id, MockHttpSession session) {
	}

	private record NbaMarket(UUID marketId, String matchId, int version) {
	}

}
