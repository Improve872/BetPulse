package com.betpulse.markets;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Component;

@Component
public class OddsEngine {

	private static final BigDecimal ONE = BigDecimal.ONE;
	private static final BigDecimal MIN_ODDS = new BigDecimal("1.001");
	private static final double KILLS_PER_SECOND = 1.2 / 60.0;
	private static final double KILL_DIFF_VOLATILITY = 0.18;

	private final OddsProperties properties;

	public OddsEngine(OddsProperties properties) {
		this.properties = properties;
	}

	public BigDecimal initialLine(MarketKind kind, int radiantKills, int direKills, long gameTimeSeconds) {
		if (!kind.lineRequired()) {
			return null;
		}
		double totalKills = radiantKills + direKills;
		double currentMinute = gameTimeSeconds / 60.0;

		double value = switch (kind) {
			case TOTAL_KILLS -> totalKills + KILLS_PER_SECOND * remainingSeconds(gameTimeSeconds);
			case KILL_HANDICAP -> radiantKills - direKills + 0.5;
			case DURATION -> Math.max(40.5, currentMinute + 5.5);
			case MATCH_WINNER -> throw new IllegalStateException("MATCH_WINNER no usa línea");
		};
		return halfLine(value);
	}

	public List<Quote> quotes(MarketKind kind, int radiantKills, int direKills, long gameTimeSeconds,
			BigDecimal line) {
		return switch (kind) {
			case MATCH_WINNER -> matchWinner(radiantKills, direKills, gameTimeSeconds);
			case TOTAL_KILLS -> totalKills(radiantKills, direKills, gameTimeSeconds, line);
			case KILL_HANDICAP -> killHandicap(radiantKills, direKills, gameTimeSeconds, line);
			case DURATION -> duration(gameTimeSeconds, line);
		};
	}

	private List<Quote> matchWinner(int radiantKills, int direKills, long gameTimeSeconds) {
		double killDiff = clamp(radiantKills - direKills, -30, 30);
		double progress = clamp(gameTimeSeconds / (double) properties.getReferenceGameSeconds(), 0.15, 1.0);
		double z = properties.getKillWeight() * killDiff * (0.6 + 0.4 * progress);
		double probability = clamp(logistic(z), properties.getMinProbability(), properties.getMaxProbability());

		return pair("RADIANT", "DIRE", probability);
	}

	private List<Quote> totalKills(int radiantKills, int direKills, long gameTimeSeconds, BigDecimal line) {
		double currentTotal = radiantKills + direKills;
		double threshold = line.doubleValue() - currentTotal;
		int killsNeeded = (int) Math.max(0, Math.ceil(threshold));
		double expectedRemaining = KILLS_PER_SECOND * remainingSeconds(gameTimeSeconds);
		double probability = clamp(poissonSurvival(expectedRemaining, killsNeeded),
				properties.getMinProbability(), properties.getMaxProbability());

		return pair("OVER", "UNDER", probability);
	}

	private List<Quote> killHandicap(int radiantKills, int direKills, long gameTimeSeconds, BigDecimal line) {
		double currentDiff = radiantKills - direKills;
		double sigma = KILL_DIFF_VOLATILITY * Math.sqrt(remainingSeconds(gameTimeSeconds));
		double probability = clamp(1.0 - normalCdf((line.doubleValue() - currentDiff) / sigma),
				properties.getMinProbability(), properties.getMaxProbability());

		return pair("RADIANT", "DIRE", probability);
	}

	private List<Quote> duration(long gameTimeSeconds, BigDecimal line) {
		double currentMinute = gameTimeSeconds / 60.0;
		double remaining = Math.max(0.001, line.doubleValue() - currentMinute);
		double meanRemaining = Math.max(5.0, 45.0 - currentMinute);
		double probability = clamp(Math.exp(-remaining / meanRemaining),
				properties.getMinProbability(), properties.getMaxProbability());

		return pair("OVER", "UNDER", probability);
	}

	private List<Quote> pair(String firstKey, String secondKey, double firstProbability) {
		BigDecimal first = BigDecimal.valueOf(firstProbability).setScale(8, RoundingMode.HALF_UP);
		BigDecimal second = ONE.subtract(first).setScale(8, RoundingMode.HALF_UP);
		return List.of(
				new Quote(firstKey, first, odds(first)),
				new Quote(secondKey, second, odds(second)));
	}

	private BigDecimal odds(BigDecimal probability) {
		BigDecimal implied = probability.multiply(ONE.add(properties.getMargin()));
		BigDecimal value = ONE.divide(implied, 6, RoundingMode.HALF_UP).setScale(3, RoundingMode.HALF_UP);
		return value.max(MIN_ODDS);
	}

	private static BigDecimal halfLine(double value) {
		double rounded = Math.round(value * 2.0) / 2.0;
		if (Math.abs(rounded - Math.rint(rounded)) < 1e-9) {
			rounded += 0.5;
		}
		return BigDecimal.valueOf(rounded).setScale(1, RoundingMode.HALF_UP);
	}

	private static double remainingSeconds(long gameTimeSeconds) {
		return Math.max(300.0, Math.max(0, 2400.0 - gameTimeSeconds));
	}

	private static double logistic(double value) {
		return 1.0 / (1.0 + Math.exp(-value));
	}

	private static double poissonSurvival(double lambda, int atLeast) {
		if (atLeast <= 0) {
			return 1.0;
		}
		if (lambda <= 0) {
			return 0.0;
		}

		double term = Math.exp(-lambda);
		double cdf = term;
		for (int index = 1; index < atLeast; index++) {
			term *= lambda / index;
			cdf += term;
			if (cdf >= 1.0) {
				return 0.0;
			}
		}
		return Math.max(0.0, Math.min(1.0, 1.0 - cdf));
	}

	private static double normalCdf(double value) {
		double absolute = Math.abs(value);
		double t = 1.0 / (1.0 + 0.2316419 * absolute);
		double density = 0.3989423 * Math.exp(-value * value / 2.0);
		double tail = density * t * (0.319381530 + t * (-0.356563782
				+ t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
		return value >= 0 ? 1.0 - tail : tail;
	}

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	public record Quote(String selectionKey, BigDecimal probability, BigDecimal odds) {
	}

}
