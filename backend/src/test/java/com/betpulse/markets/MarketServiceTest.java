package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.IntegrationTestBase;
import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.LobbyDtos.LobbyTeam;
import com.betpulse.markets.MarketDtos.LiveMarketsResponse;
import com.betpulse.markets.MarketDtos.MarketView;

class MarketServiceTest extends IntegrationTestBase {

	@Autowired
	private MarketService marketService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	@Transactional
	void createsVersionedMarketAndHistory() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));

		MarketView market = findMarket(matchId);
		assertThat(market.status()).isEqualTo("OPEN");
		assertThat(market.version()).isEqualTo(1);
		assertThat(market.selections()).hasSize(2);
		assertThat(market.selections()).extracting(MarketDtos.SelectionView::key)
				.containsExactly("RADIANT", "DIRE");
		assertThat(historyCount(matchId)).isEqualTo(2);
	}

	@Test
	@Transactional
	void doesNotBumpVersionWhenOddsDoNotChange() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));

		MarketView market = findMarket(matchId);
		assertThat(market.version()).isEqualTo(1);
		assertThat(historyCount(matchId)).isEqualTo(2);
	}

	@Test
	@Transactional
	void bumpsVersionAndAppendsHistoryWhenScoreChanges() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(matchId, 20, 8, 1200, "LIVE", false));

		MarketView market = findMarket(matchId);
		assertThat(market.version()).isEqualTo(2);
		assertThat(historyCount(matchId)).isEqualTo(4);
	}

	@Test
	@Transactional
	void suspendsOnStaleFeedAndReopensOnRecovery() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(matchId, 12, 8, 1200, "STALE", true));

		MarketView suspended = findMarket(matchId);
		assertThat(suspended.status()).isEqualTo("SUSPENDED");
		assertThat(suspended.suspensionReason()).isEqualTo("FEED_STALE");

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));

		MarketView reopened = findMarket(matchId);
		assertThat(reopened.status()).isEqualTo("OPEN");
		assertThat(reopened.suspensionReason()).isNull();
	}

	@Test
	@Transactional
	void closesMarketWhenMatchLeavesLiveList() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(null, 0, 0, 0, "LIVE", false));

		String status = jdbcTemplate.queryForObject("SELECT status FROM markets WHERE match_id = ?",
				String.class, matchId);
		assertThat(status).isEqualTo("CLOSED");
		assertThat(marketService.getLiveMarkets().markets()).extracting(MarketView::matchId)
				.doesNotContain(matchId);
	}

	private MarketView findMarket(String matchId) {
		LiveMarketsResponse response = marketService.getLiveMarkets();
		return response.markets().stream()
				.filter(market -> market.matchId().equals(matchId))
				.findFirst()
				.orElseThrow();
	}

	private int historyCount(String matchId) {
		Integer count = jdbcTemplate.queryForObject("""
				SELECT count(*)
				FROM odds_history h
				JOIN markets m ON m.id = h.market_id
				WHERE m.match_id = ?
				""", Integer.class, matchId);
		return count == null ? 0 : count;
	}

	private static LobbyResponse lobby(String matchId, int radiantKills, int direKills, long durationSeconds,
			String feedStatus, boolean stale) {
		Instant now = Instant.parse("2026-10-26T12:00:00Z");
		List<LobbyMatch> live = matchId == null ? List.of()
				: List.of(new LobbyMatch(matchId, "dota2", "live", "Test League", "pro", "BO3",
						now.getEpochSecond(), durationSeconds,
						new LobbyTeam("Team Radiant", radiantKills, "radiant", null),
						new LobbyTeam("Team Dire", direKills, "dire", null),
						7000, 500, 120));
		return new LobbyResponse(live, List.of(), now,
				new FeedHealth("OPENDOTA", feedStatus, now, now, now.plusSeconds(30), 0, null, stale));
	}

	private static String uniqueMatchId() {
		return "test-" + UUID.randomUUID().toString().substring(0, 20);
	}

}
