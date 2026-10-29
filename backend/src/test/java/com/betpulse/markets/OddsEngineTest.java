package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

class OddsEngineTest {

	private final OddsEngine engine = new OddsEngine(new OddsProperties());

	@Test
	void evenMatchHasBalancedOddsAndMargin() {
		List<OddsEngine.Quote> quotes = engine.quotes(MarketKind.MATCH_WINNER, 10, 10, 1200, null);
		OddsEngine.Quote radiant = quote(quotes, "RADIANT");
		OddsEngine.Quote dire = quote(quotes, "DIRE");

		assertThat(radiant.probability()).isEqualByComparingTo("0.50000000");
		assertThat(dire.probability()).isEqualByComparingTo("0.50000000");
		assertThat(radiant.odds()).isEqualByComparingTo("1.887");
		assertThat(dire.odds()).isEqualByComparingTo("1.887");
		assertThat(radiant.odds().add(dire.odds())).isGreaterThan(new BigDecimal("3.77"));
	}

	@Test
	void radiantLeadRaisesRadiantProbabilityAndLowersOdds() {
		List<OddsEngine.Quote> quotes = engine.quotes(MarketKind.MATCH_WINNER, 20, 10, 1200, null);
		OddsEngine.Quote radiant = quote(quotes, "RADIANT");
		OddsEngine.Quote dire = quote(quotes, "DIRE");

		assertThat(radiant.probability()).isGreaterThan(new BigDecimal("0.5"));
		assertThat(dire.probability()).isLessThan(new BigDecimal("0.5"));
		assertThat(radiant.odds()).isLessThan(dire.odds());
	}

	@Test
	void probabilitiesSumToOneAndOddsAreAtLeastOne() {
		List<OddsEngine.Quote> quotes = engine.quotes(MarketKind.MATCH_WINNER, 50, 0, 2400, null);
		OddsEngine.Quote radiant = quote(quotes, "RADIANT");
		OddsEngine.Quote dire = quote(quotes, "DIRE");

		assertThat(radiant.probability().add(dire.probability())).isEqualByComparingTo("1.00000000");
		assertThat(radiant.odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
		assertThat(dire.odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
		assertThat(radiant.probability()).isEqualByComparingTo("0.92000000");
	}

	@Test
	void probabilityIsClampedForExtremeScore() {
		List<OddsEngine.Quote> quotes = engine.quotes(MarketKind.MATCH_WINNER, 0, 50, 2400, null);

		assertThat(quote(quotes, "RADIANT").probability()).isEqualByComparingTo("0.08000000");
		assertThat(quote(quotes, "DIRE").probability()).isEqualByComparingTo("0.92000000");
	}

	@Test
	void totalKillsAndDurationUseHalfLines() {
		BigDecimal totalLine = engine.initialLine(MarketKind.TOTAL_KILLS, 0, 0, 0);
		BigDecimal durationLine = engine.initialLine(MarketKind.DURATION, 0, 0, 0);

		assertThat(totalLine).isEqualByComparingTo("48.5");
		assertThat(durationLine).isEqualByComparingTo("40.5");
		assertThat(totalLine.remainder(BigDecimal.ONE)).isEqualByComparingTo("0.5");
		assertThat(durationLine.remainder(BigDecimal.ONE)).isEqualByComparingTo("0.5");
	}

	@Test
	void overUnderAndHandicapProbabilitiesAreBalanced() {
		assertBalanced(engine.quotes(MarketKind.TOTAL_KILLS, 20, 18, 1200, new BigDecimal("62.5")), "OVER", "UNDER");
		assertBalanced(engine.quotes(MarketKind.KILL_HANDICAP, 20, 18, 1200, new BigDecimal("2.5")), "RADIANT", "DIRE");
		assertBalanced(engine.quotes(MarketKind.DURATION, 15, 13, 1500, new BigDecimal("40.5")), "OVER", "UNDER");
	}

	@Test
	void overProbabilityRisesAsKillsAreAdded() {
		BigDecimal line = new BigDecimal("50.5");
		BigDecimal early = quote(engine.quotes(MarketKind.TOTAL_KILLS, 5, 5, 600, line), "OVER").probability();
		BigDecimal late = quote(engine.quotes(MarketKind.TOTAL_KILLS, 20, 25, 1800, line), "OVER").probability();

		assertThat(late).isGreaterThan(early);
	}

	private static void assertBalanced(List<OddsEngine.Quote> quotes, String firstKey, String secondKey) {
		OddsEngine.Quote first = quote(quotes, firstKey);
		OddsEngine.Quote second = quote(quotes, secondKey);

		assertThat(first.probability().add(second.probability())).isEqualByComparingTo("1.00000000");
		assertThat(first.odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
		assertThat(second.odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
	}

	private static OddsEngine.Quote quote(List<OddsEngine.Quote> quotes, String selectionKey) {
		return quotes.stream()
				.filter(quote -> quote.selectionKey().equals(selectionKey))
				.findFirst()
				.orElseThrow();
	}

}
