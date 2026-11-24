package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.betpulse.markets.OddsEngine.Quote;

class BasketballOddsModelTest {

	private final BasketballOddsModel model = new BasketballOddsModel(new OddsProperties());

	@Test
	void twoWayProbabilitiesSumToOneAndRewardHomeCourt() {
		double[] balanced = model.fairProbabilities(112.0, 112.0);
		double[] homeStrong = model.fairProbabilities(120.0, 105.0);

		assertThat(balanced[0] + balanced[1]).isCloseTo(1.0, org.assertj.core.data.Offset.offset(1e-6));
		assertThat(homeStrong[0]).isGreaterThan(0.5);
		assertThat(homeStrong[0]).isGreaterThan(balanced[0]);
	}

	@Test
	void strongDefenseLowersOpponentExpectedPoints() {
		TeamStrength home = new TeamStrength(1.05, 0.95, 15);
		TeamStrength away = new TeamStrength(1.0, 1.0, 15);
		double[] points = BasketballOddsModel.expectedPoints(home, away, 110.0, 1.02);

		assertThat(points[0]).isGreaterThan(points[1]);
		assertThat(points[0]).isBetween(70.0, 160.0);
	}

	@Test
	void quotesApplyMarginWithThreeDecimals() {
		List<Quote> quotes = model.quotes(BasketballMarketKind.MATCH_RESULT_2WAY, null, 114.0, 109.0);

		assertThat(quotes).hasSize(2);
		assertThat(quotes).extracting(Quote::selectionKey).containsExactly("HOME", "AWAY");
		for (Quote quote : quotes) {
			assertThat(quote.odds().scale()).isEqualTo(3);
			assertThat(quote.odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
		}
	}

	@Test
	void totalLineIsHalfPointNearExpectedTotal() {
		BigDecimal line = model.totalLine(112.0, 110.0);

		assertThat(line.doubleValue()).isBetween(215.0, 229.0);
		assertThat(line.remainder(BigDecimal.ONE)).isNotEqualTo(BigDecimal.ZERO);
	}

	@Test
	void overProbabilityFallsWhenLineRises() {
		List<Quote> low = model.quotes(BasketballMarketKind.TOTAL_POINTS, new BigDecimal("215.5"), 112.0, 110.0);
		List<Quote> high = model.quotes(BasketballMarketKind.TOTAL_POINTS, new BigDecimal("235.5"), 112.0, 110.0);

		assertThat(low.get(0).probability()).isGreaterThan(high.get(0).probability());
		assertThat(low.get(1).probability()).isLessThan(high.get(1).probability());
	}

}
