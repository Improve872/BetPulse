package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.IntegrationTestBase;
import com.betpulse.catalog.CatalogUpdatedEvent;
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

	@Autowired
	private ApplicationEventPublisher eventPublisher;

	@Test
	@Transactional
	void catalogEventCreatesMarketThroughListenerPath() {
		String matchId = uniqueMatchId();

		eventPublisher.publishEvent(new CatalogUpdatedEvent(lobby(matchId, 12, 8, 1200, "LIVE", false)));

		MarketView market = findMarket(matchId, "MATCH_WINNER");
		assertThat(market.status()).isEqualTo("OPEN");
		assertThat(market.version()).isEqualTo(1);
		assertThat(historyCount(matchId, "MATCH_WINNER")).isEqualTo(2);
		assertThat(marketService.getLiveMarkets().markets())
				.filteredOn(view -> view.matchId().equals(matchId))
				.hasSize(4);
	}

	@Test
	@Transactional
	void createsVersionedMarketAndHistory() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));

		MarketView market = findMarket(matchId, "MATCH_WINNER");
		assertThat(market.status()).isEqualTo("OPEN");
		assertThat(market.version()).isEqualTo(1);
		assertThat(market.selections()).hasSize(2);
		assertThat(market.selections()).extracting(MarketDtos.SelectionView::key)
				.containsExactly("RADIANT", "DIRE");
		assertThat(historyCount(matchId, "MATCH_WINNER")).isEqualTo(2);
		assertThat(findMarket(matchId, "TOTAL_KILLS").line()).isNotNull();
		assertThat(findMarket(matchId, "KILL_HANDICAP").line()).isNotNull();
		assertThat(findMarket(matchId, "DURATION").line()).isNotNull();
	}

	@Test
	@Transactional
	void doesNotBumpVersionWhenOddsDoNotChange() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));

		MarketView market = findMarket(matchId, "MATCH_WINNER");
		assertThat(market.version()).isEqualTo(1);
		assertThat(historyCount(matchId, "MATCH_WINNER")).isEqualTo(2);
	}

	@Test
	@Transactional
	void bumpsVersionAndAppendsHistoryWhenScoreChanges() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(matchId, 20, 8, 1200, "LIVE", false));

		MarketView market = findMarket(matchId, "MATCH_WINNER");
		assertThat(market.version()).isEqualTo(2);
		assertThat(historyCount(matchId, "MATCH_WINNER")).isEqualTo(4);
	}

	@Test
	@Transactional
	void suspendsOnStaleFeedAndReopensOnRecovery() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(matchId, 12, 8, 1200, "STALE", true));

		MarketView suspended = findMarket(matchId, "MATCH_WINNER");
		assertThat(suspended.status()).isEqualTo("SUSPENDED");
		assertThat(suspended.suspensionReason()).isEqualTo("FEED_STALE");
		assertThat(marketService.getLiveMarkets().markets())
				.filteredOn(view -> view.matchId().equals(matchId))
				.hasSize(4)
				.allMatch(view -> "SUSPENDED".equals(view.status()));

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));

		MarketView reopened = findMarket(matchId, "MATCH_WINNER");
		assertThat(reopened.status()).isEqualTo("OPEN");
		assertThat(reopened.suspensionReason()).isNull();
	}

	@Test
	@Transactional
	void closesMarketWhenMatchLeavesLiveList() {
		String matchId = uniqueMatchId();

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		marketService.sync(lobby(null, 0, 0, 0, "LIVE", false));

		String status = jdbcTemplate.queryForObject("""
				SELECT status FROM markets
				WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", String.class, matchId);
		assertThat(status).isEqualTo("CLOSED");
		assertThat(marketService.getLiveMarkets().markets()).extracting(MarketView::matchId)
				.doesNotContain(matchId);

		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		String statusAfterReappearing = jdbcTemplate.queryForObject("""
				SELECT status FROM markets
				WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", String.class, matchId);
		assertThat(statusAfterReappearing).isEqualTo("CLOSED");
	}

	@Test
	@Transactional
	void closesDeterministicTotalKillsMarket() {
		String matchId = uniqueMatchId();
		marketService.sync(lobby(matchId, 30, 25, 1800, "LIVE", false));
		jdbcTemplate.update("""
				UPDATE markets SET line = 54.5
				WHERE match_id = ? AND market_key = 'TOTAL_KILLS'
				""", matchId);

		marketService.sync(lobby(matchId, 30, 25, 1800, "LIVE", false));

		String status = jdbcTemplate.queryForObject("""
				SELECT status FROM markets
				WHERE match_id = ? AND market_key = 'TOTAL_KILLS'
				""", String.class, matchId);
		assertThat(status).isEqualTo("CLOSED");
		assertThat(marketService.getLiveMarkets().markets())
				.filteredOn(view -> view.matchId().equals(matchId))
				.extracting(MarketView::marketKey)
				.doesNotContain("TOTAL_KILLS");
	}

	@Test
	@Transactional
	void doesNotReopenSettledMarket() {
		String matchId = uniqueMatchId();
		marketService.sync(lobby(matchId, 12, 8, 1200, "LIVE", false));
		jdbcTemplate.update("""
				UPDATE markets SET status = 'SETTLED'
				WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", matchId);

		marketService.sync(lobby(matchId, 20, 8, 1200, "LIVE", false));

		String status = jdbcTemplate.queryForObject("""
				SELECT status FROM markets
				WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", String.class, matchId);
		Integer version = jdbcTemplate.queryForObject("""
				SELECT version FROM markets
				WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", Integer.class, matchId);
		assertThat(status).isEqualTo("SETTLED");
		assertThat(version).isEqualTo(1);
		assertThat(historyCount(matchId, "MATCH_WINNER")).isEqualTo(2);
	}

	private MarketView findMarket(String matchId, String marketKey) {
		LiveMarketsResponse response = marketService.getLiveMarkets();
		return response.markets().stream()
				.filter(market -> market.matchId().equals(matchId))
				.filter(market -> market.marketKey().equals(marketKey))
				.findFirst()
				.orElseThrow();
	}

	private int historyCount(String matchId, String marketKey) {
		Integer count = jdbcTemplate.queryForObject("""
				SELECT count(*)
				FROM odds_history h
				JOIN markets m ON m.id = h.market_id
				WHERE m.match_id = ? AND m.market_key = ?
				""", Integer.class, matchId, marketKey);
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
