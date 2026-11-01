package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.IntegrationTestBase;
import com.betpulse.markets.MarketResultStore.MarketResultRow;

@Transactional
class MarketResultFlowTest extends IntegrationTestBase {

	@Autowired
	private MarketResultService marketResultService;

	@Autowired
	private MarketResultStore marketResultStore;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void resolvesClosedMarketOnceAndSettlesIt() {
		String matchId = uniqueMatchId();
		UUID marketId = insertMarket(matchId, "TOTAL_KILLS", new BigDecimal("80.5"));
		insertResult(matchId, "READY", true, 44, 37, 3078);

		int resolved = marketResultService.runOnce();

		MarketResultRow result = marketResultStore.find(marketId).orElseThrow();
		assertThat(result.outcome()).isEqualTo("SETTLED");
		assertThat(result.winningSelectionKey()).isEqualTo("OVER");
		assertThat(result.resolver()).isEqualTo("MARKET_RESULT_V1");
		assertThat(marketStatus(marketId)).isEqualTo("SETTLED");
		assertThat(resolved).isGreaterThanOrEqualTo(1);

		int secondRun = marketResultService.runOnce();

		assertThat(secondRun).isZero();
		assertThat(resultCount(matchId)).isEqualTo(1);
	}

	@Test
	void voidsMarketsWhenMatchResultIsVoid() {
		String matchId = uniqueMatchId();
		UUID marketId = insertMarket(matchId, "MATCH_WINNER", null);
		insertResult(matchId, "VOID", null, null, null, null);

		marketResultService.runOnce();

		MarketResultRow result = marketResultStore.find(marketId).orElseThrow();
		assertThat(result.outcome()).isEqualTo("VOID");
		assertThat(result.winningSelectionKey()).isNull();
		assertThat(marketStatus(marketId)).isEqualTo("VOID");
	}

	@Test
	void doesNotResolveMarketsWithoutFinalResult() {
		String matchId = uniqueMatchId();
		UUID marketId = insertMarket(matchId, "MATCH_WINNER", null);
		insertResult(matchId, "PENDING", null, null, null, null);

		int resolved = marketResultService.runOnce();

		assertThat(resolved).isZero();
		assertThat(marketResultStore.find(marketId)).isEmpty();
		assertThat(marketStatus(marketId)).isEqualTo("CLOSED");
	}

	private UUID insertMarket(String matchId, String marketKey, BigDecimal line) {
		return jdbcTemplate.queryForObject("""
				INSERT INTO markets (match_id, market_key, market_type, title, line, status, closed_at)
				VALUES (?, ?, ?, ?, ?, 'CLOSED', now())
				RETURNING id
				""", UUID.class, matchId, marketKey, marketKey, marketKey, line);
	}

	private void insertResult(String matchId, String status, Boolean radiantWin, Integer radiantScore,
			Integer direScore, Integer durationSeconds) {
		jdbcTemplate.update("""
				INSERT INTO match_results (match_id, status, radiant_win, radiant_score, dire_score, duration_seconds)
				VALUES (?, ?, ?, ?, ?, ?)
				""", matchId, status, radiantWin, radiantScore, direScore, durationSeconds);
	}

	private String marketStatus(UUID marketId) {
		return jdbcTemplate.queryForObject("SELECT status FROM markets WHERE id = ?", String.class, marketId);
	}

	private int resultCount(String matchId) {
		Integer count = jdbcTemplate.queryForObject(
				"SELECT count(*) FROM market_results WHERE match_id = ?", Integer.class, matchId);
		return count == null ? 0 : count;
	}

	private static String uniqueMatchId() {
		return "test-" + UUID.randomUUID().toString().substring(0, 20);
	}

}
