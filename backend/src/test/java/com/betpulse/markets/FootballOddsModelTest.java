package com.betpulse.markets;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.betpulse.markets.TeamStrength;
import com.betpulse.markets.OddsEngine.Quote;

class FootballOddsModelTest {

	private final FootballOddsModel model = new FootballOddsModel(new OddsProperties());

	@Test
	void balancedTeamsProduceCoherent1x2Probabilities() {
		double[] probabilities = model.fairProbabilities(1.35, 1.20);

		assertThat(probabilities[0] + probabilities[1] + probabilities[2]).isCloseTo(1.0, within(1e-6));
		assertThat(probabilities[0]).isGreaterThan(probabilities[2]);
		assertThat(probabilities[1]).isBetween(0.15, 0.40);
	}

	@Test
	void strongerAttackRaisesHomeProbability() {
		double[] strong = model.fairProbabilities(2.4, 0.8);
		double[] weak = model.fairProbabilities(0.8, 2.4);

		assertThat(strong[0]).isGreaterThan(strong[2]);
		assertThat(weak[2]).isGreaterThan(weak[0]);
		assertThat(strong[0]).isGreaterThan(weak[0]);
	}

	@Test
	void quotesApplyMarginAndKeepThreeDecimals() {
		List<Quote> quotes = model.quotes(FootballMarketKind.MATCH_RESULT_1X2, null, 1.5, 1.1);

		assertThat(quotes).hasSize(3);
		assertThat(quotes).extracting(Quote::selectionKey).containsExactly("HOME", "DRAW", "AWAY");
		for (Quote quote : quotes) {
			assertThat(quote.odds().scale()).isEqualTo(3);
			assertThat(quote.odds()).isGreaterThanOrEqualTo(new BigDecimal("1.001"));
			assertThat(quote.probability()).isLessThan(BigDecimal.ONE);
		}
		BigDecimal implied = quotes.stream()
				.map(quote -> BigDecimal.ONE.divide(quote.odds(), 8, java.math.RoundingMode.HALF_UP))
				.reduce(BigDecimal.ZERO, BigDecimal::add);
		assertThat(implied.doubleValue()).isGreaterThan(1.0);
	}

	@Test
	void totalLineIsHalfPointNearExpectedGoals() {
		BigDecimal line = model.totalLine(1.6, 1.2);

		assertThat(line.doubleValue()).isBetween(2.0, 3.5);
		assertThat(line.remainder(BigDecimal.ONE)).isNotEqualTo(BigDecimal.ZERO);
		assertThat(line.stripTrailingZeros().scale()).isLessThanOrEqualTo(1);
	}

	@Test
	void totalGoalsOverProbabilityFallsWhenLineRises() {
		List<Quote> lowLine = model.quotes(FootballMarketKind.TOTAL_GOALS, new BigDecimal("1.5"), 1.5, 1.2);
		List<Quote> highLine = model.quotes(FootballMarketKind.TOTAL_GOALS, new BigDecimal("3.5"), 1.5, 1.2);

		assertThat(lowLine.get(0).probability()).isGreaterThan(highLine.get(0).probability());
		assertThat(lowLine.get(1).probability()).isLessThan(highLine.get(1).probability());
	}

	@Test
	void expectedGoalsRewardsAttackAndHomeAdvantage() {
		TeamStrength home = new TeamStrength(1.4, 0.8, 10);
		TeamStrength away = new TeamStrength(1.0, 1.1, 10);
		double[] goals = FootballOddsModel.expectedGoals(home, away, 1.35, 1.10);

		assertThat(goals[0]).isGreaterThan(goals[1]);
		assertThat(goals[0]).isBetween(0.2, 5.0);
	}

	private static org.assertj.core.data.Offset<Double> within(double value) {
		return org.assertj.core.data.Offset.offset(value);
	}

}
