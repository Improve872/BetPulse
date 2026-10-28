package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;

import org.junit.jupiter.api.Test;

class OddsEngineTest {

	private final OddsEngine engine = new OddsEngine(new OddsProperties());

	@Test
	void evenMatchHasBalancedOddsAndMargin() {
		OddsEngine.MatchWinnerQuote quote = engine.matchWinner(10, 10, 1200);

		assertThat(quote.radiant().probability()).isEqualByComparingTo("0.50000000");
		assertThat(quote.dire().probability()).isEqualByComparingTo("0.50000000");
		assertThat(quote.radiant().odds()).isEqualByComparingTo("1.887");
		assertThat(quote.dire().odds()).isEqualByComparingTo("1.887");
		assertThat(quote.radiant().odds().add(quote.dire().odds())).isGreaterThan(new BigDecimal("3.77"));
	}

	@Test
	void radiantLeadRaisesRadiantProbabilityAndLowersOdds() {
		OddsEngine.MatchWinnerQuote quote = engine.matchWinner(20, 10, 1200);

		assertThat(quote.radiant().probability()).isGreaterThan(new BigDecimal("0.5"));
		assertThat(quote.dire().probability()).isLessThan(new BigDecimal("0.5"));
		assertThat(quote.radiant().odds()).isLessThan(quote.dire().odds());
	}

	@Test
	void probabilitiesSumToOneAndOddsAreAtLeastOne() {
		OddsEngine.MatchWinnerQuote quote = engine.matchWinner(50, 0, 2400);

		assertThat(quote.radiant().probability().add(quote.dire().probability())).isEqualByComparingTo("1.00000000");
		assertThat(quote.radiant().odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
		assertThat(quote.dire().odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
		assertThat(quote.radiant().probability()).isEqualByComparingTo("0.92000000");
	}

	@Test
	void probabilityIsClampedForExtremeScore() {
		OddsEngine.MatchWinnerQuote quote = engine.matchWinner(0, 50, 2400);

		assertThat(quote.radiant().probability()).isEqualByComparingTo("0.08000000");
		assertThat(quote.dire().probability()).isEqualByComparingTo("0.92000000");
	}

}
