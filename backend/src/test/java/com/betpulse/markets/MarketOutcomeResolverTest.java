package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.betpulse.markets.MarketOutcomeResolver.Resolution;
import com.fasterxml.jackson.databind.ObjectMapper;

class MarketOutcomeResolverTest {

	private final MarketOutcomeResolver resolver = new MarketOutcomeResolver(new ObjectMapper());

	@Test
	void matchWinnerFollowsFinalResult() {
		assertThat(resolve(MarketKind.MATCH_WINNER, null, true, 44, 37, 3078).winningSelectionKey())
				.isEqualTo("RADIANT");
		assertThat(resolve(MarketKind.MATCH_WINNER, null, false, 44, 37, 3078).winningSelectionKey())
				.isEqualTo("DIRE");
		assertThat(resolve(MarketKind.MATCH_WINNER, null, null, 44, 37, 3078).voided()).isTrue();
	}

	@Test
	void totalKillsComparesFinalTotalWithLine() {
		assertThat(resolve(MarketKind.TOTAL_KILLS, new BigDecimal("80.5"), true, 44, 37, 3078)
				.winningSelectionKey()).isEqualTo("OVER");
		assertThat(resolve(MarketKind.TOTAL_KILLS, new BigDecimal("81.5"), true, 44, 37, 3078)
				.winningSelectionKey()).isEqualTo("UNDER");
		assertThat(resolve(MarketKind.TOTAL_KILLS, null, true, 44, 37, 3078).voided()).isTrue();
	}

	@Test
	void killHandicapUsesFinalKillDifference() {
		assertThat(resolve(MarketKind.KILL_HANDICAP, new BigDecimal("6.5"), true, 44, 37, 3078)
				.winningSelectionKey()).isEqualTo("RADIANT");
		assertThat(resolve(MarketKind.KILL_HANDICAP, new BigDecimal("7.5"), true, 44, 37, 3078)
				.winningSelectionKey()).isEqualTo("DIRE");
	}

	@Test
	void durationComparesMinutesWithLine() {
		// 3078 s = 51.3 min
		assertThat(resolve(MarketKind.DURATION, new BigDecimal("50.5"), true, 44, 37, 3078)
				.winningSelectionKey()).isEqualTo("OVER");
		assertThat(resolve(MarketKind.DURATION, new BigDecimal("51.5"), true, 44, 37, 3078)
				.winningSelectionKey()).isEqualTo("UNDER");
	}

	@Test
	void resolvesFirstBloodFromGsiEvents() {
		String events = """
				[{"type":"FIRST_BLOOD","team":"dire","clockTime":76}]
				""";

		Resolution resolution = resolver.resolve(MarketKind.FIRST_BLOOD, null, true, 0, 1, 300,
				events, null);

		assertThat(resolution.winningSelectionKey()).isEqualTo("DIRE");
	}

	@Test
	void resolvesFirstTowerFromOpenDotaObjectives() {
		String objectives = """
				[{"time":486,"type":"building_kill","key":"npc_dota_goodguys_tower1_top"}]
				""";

		Resolution resolution = resolver.resolve(MarketKind.FIRST_TOWER, null, true, 10, 8, 1200,
				objectives, null);

		assertThat(resolution.winningSelectionKey()).isEqualTo("DIRE");
	}

	@Test
	void resolvesNextRoshanOnlyAfterMarketOpening() {
		String events = """
				[{"type":"ROSHAN_KILL","team":"radiant","receivedAt":"2026-11-01T18:00:00Z"},
				 {"type":"ROSHAN_KILL","team":"dire","receivedAt":"2026-11-01T18:10:00Z"}]
				""";

		Resolution resolution = resolver.resolve(MarketKind.NEXT_ROSHAN, null, true, 20, 20, 1800,
				events, Instant.parse("2026-11-01T18:05:00Z"));

		assertThat(resolution.winningSelectionKey()).isEqualTo("DIRE");
	}

	@Test
	void voidsEventMarketWithoutMatchingEvent() {
		Resolution resolution = resolver.resolve(MarketKind.FIRST_BLOOD, null, true, 0, 0, 120,
				"[]", null);

		assertThat(resolution.voided()).isTrue();
	}

	@Test
	void voidedMatchStatusVoidsEveryMarket() {
		Resolution resolution = resolver.resolve("MATCH_WINNER", null, "VOID", true, 44, 37, 3078);

		assertThat(resolution.voided()).isTrue();
		assertThat(resolution.winningSelectionKey()).isNull();
	}

	@Test
	void unknownMarketKeyIsVoided() {
		Resolution resolution = resolver.resolve("UNKNOWN", null, "READY", true, 44, 37, 3078);

		assertThat(resolution.voided()).isTrue();
	}

	private Resolution resolve(MarketKind kind, BigDecimal line, Boolean radiantWin, int radiantScore,
			int direScore, int durationSeconds) {
		return resolver.resolve(kind, line, radiantWin, radiantScore, direScore, durationSeconds);
	}

}
