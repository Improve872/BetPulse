package com.betpulse.markets;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Component;

@Component
public class OddsEngine {

	private static final BigDecimal ONE = BigDecimal.ONE;
	private static final BigDecimal MIN_ODDS = new BigDecimal("1.001");

	private final OddsProperties properties;

	public OddsEngine(OddsProperties properties) {
		this.properties = properties;
	}

	public MatchWinnerQuote matchWinner(int radiantKills, int direKills, long gameTimeSeconds) {
		double killDiff = clamp(radiantKills - direKills, -30, 30);
		double progress = clamp(gameTimeSeconds / (double) properties.getReferenceGameSeconds(), 0.15, 1.0);
		double z = properties.getKillWeight() * killDiff * (0.6 + 0.4 * progress);
		double rawProbability = 1.0 / (1.0 + Math.exp(-z));
		double probability = clamp(rawProbability, properties.getMinProbability(), properties.getMaxProbability());

		BigDecimal radiantProbability = BigDecimal.valueOf(probability).setScale(8, RoundingMode.HALF_UP);
		BigDecimal direProbability = ONE.subtract(radiantProbability).setScale(8, RoundingMode.HALF_UP);

		return new MatchWinnerQuote(
				new Quote("RADIANT", radiantProbability, odds(radiantProbability)),
				new Quote("DIRE", direProbability, odds(direProbability)));
	}

	private BigDecimal odds(BigDecimal probability) {
		BigDecimal implied = probability.multiply(ONE.add(properties.getMargin()));
		BigDecimal value = ONE.divide(implied, 6, RoundingMode.HALF_UP).setScale(3, RoundingMode.HALF_UP);
		return value.max(MIN_ODDS);
	}

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	public record Quote(String selectionKey, BigDecimal probability, BigDecimal odds) {
	}

	public record MatchWinnerQuote(Quote radiant, Quote dire) {
	}

}
