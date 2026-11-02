package com.betpulse.admin;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.betpulse.IntegrationTestBase;
import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.LobbyDtos.LobbyTeam;
import com.betpulse.markets.MarketService;

class AdminMarketFlowTest extends IntegrationTestBase {

	@Autowired
	private MarketService marketService;

	@Autowired
	private AdminMarketService adminMarketService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void overridesOddsAndAudits() {
		UUID adminId = adminId();
		UUID marketId = createMarket();

		adminMarketService.override(marketId, adminId, "RADIANT", new BigDecimal("1.500"), "Ajuste manual");

		assertThat(jdbcTemplate.queryForObject("""
				SELECT odds FROM selections WHERE market_id = ? AND selection_key = 'RADIANT'
				""", BigDecimal.class, marketId)).isEqualByComparingTo("1.500");
		assertThat(jdbcTemplate.queryForObject("SELECT version FROM markets WHERE id = ?",
				Integer.class, marketId)).isEqualTo(2);
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM odds_history WHERE market_id = ? AND source = 'ADMIN_OVERRIDE'
				""", Integer.class, marketId)).isEqualTo(1);
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs WHERE action = 'MARKET_OVERRIDE' AND entity_id = ?
				""", Integer.class, marketId.toString())).isEqualTo(1);
	}

	@Test
	void suspendsAndResumesMarket() {
		UUID adminId = adminId();
		UUID marketId = createMarket();

		adminMarketService.suspend(marketId, adminId, "Revisión");
		assertThat(status(marketId)).isEqualTo("SUSPENDED");
		assertThat(reason(marketId)).isEqualTo("Revisión");

		adminMarketService.resume(marketId, adminId, "Revisado");
		assertThat(status(marketId)).isEqualTo("OPEN");
		assertThat(reason(marketId)).isNull();
	}

	private UUID createMarket() {
		String matchId = "admin-" + UUID.randomUUID().toString().substring(0, 18);
		marketService.sync(lobby(matchId));
		return jdbcTemplate.queryForObject("""
				SELECT id FROM markets WHERE match_id = ? AND market_key = 'MATCH_WINNER'
				""", UUID.class, matchId);
	}

	private UUID adminId() {
		return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = 'admin@betpulse.local'",
				UUID.class);
	}

	private String status(UUID marketId) {
		return jdbcTemplate.queryForObject("SELECT status FROM markets WHERE id = ?", String.class, marketId);
	}

	private String reason(UUID marketId) {
		return jdbcTemplate.queryForObject("SELECT suspension_reason FROM markets WHERE id = ?",
				String.class, marketId);
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

}
