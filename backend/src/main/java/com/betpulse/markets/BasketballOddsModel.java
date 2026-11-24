package com.betpulse.markets;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Component;

import com.betpulse.markets.OddsEngine.Quote;

/**
 * Modelo pre-partida de baloncesto. A diferencia del fútbol, el marcador es
 * alto y continuo: se modela con una normal (margen y total) en lugar de
 * Poisson. Los puntos esperados salen de la tabla real de ESPN.
 */
@Component
public class BasketballOddsModel {

	private static final double MARGIN_SIGMA = 12.0;
	private static final double TOTAL_SIGMA = 18.0;
	private static final double MIN_PROBABILITY = 0.03;
	private static final double MAX_PROBABILITY = 0.97;
	private static final BigDecimal ONE = BigDecimal.ONE;
	private static final BigDecimal MIN_ODDS = new BigDecimal("1.001");

	private final OddsProperties properties;

	public BasketballOddsModel(OddsProperties properties) {
		this.properties = properties;
	}

	public List<Quote> quotes(BasketballMarketKind kind, BigDecimal line, double homeExpected, double awayExpected) {
		return switch (kind) {
			case MATCH_RESULT_2WAY -> matchWinner(homeExpected, awayExpected);
			case TOTAL_POINTS -> totalPoints(line, homeExpected, awayExpected);
		};
	}

	public double[] fairProbabilities(double homeExpected, double awayExpected) {
		double margin = homeExpected - awayExpected;
		double home = clamp(normalCdf(margin / MARGIN_SIGMA), MIN_PROBABILITY, MAX_PROBABILITY);
		return new double[] { home, 1.0 - home };
	}

	public BigDecimal totalLine(double homeExpected, double awayExpected) {
		double expected = homeExpected + awayExpected;
		double line = Math.round(expected * 2.0) / 2.0;
		if (Math.abs(line - Math.rint(line)) < 1e-9) {
			line += 0.5;
		}
		return BigDecimal.valueOf(Math.max(150.5, line)).setScale(1, RoundingMode.HALF_UP);
	}

	private List<Quote> matchWinner(double homeExpected, double awayExpected) {
		double[] probabilities = fairProbabilities(homeExpected, awayExpected);
		return List.of(quote("HOME", probabilities[0]), quote("AWAY", probabilities[1]));
	}

	private List<Quote> totalPoints(BigDecimal line, double homeExpected, double awayExpected) {
		if (line == null) {
			throw new IllegalArgumentException("Total de puntos requiere línea");
		}
		double total = homeExpected + awayExpected;
		double over = 1.0 - normalCdf((line.doubleValue() - total) / TOTAL_SIGMA);
		double probability = clamp(over, MIN_PROBABILITY, MAX_PROBABILITY);
		return List.of(quote("OVER", probability), quote("UNDER", 1.0 - probability));
	}

	private Quote quote(String selectionKey, double probability) {
		BigDecimal fair = BigDecimal.valueOf(probability).setScale(8, RoundingMode.HALF_UP);
		return new Quote(selectionKey, fair, odds(fair));
	}

	private BigDecimal odds(BigDecimal probability) {
		BigDecimal implied = probability.multiply(ONE.add(properties.getMargin()));
		BigDecimal value = ONE.divide(implied, 6, RoundingMode.HALF_UP).setScale(3, RoundingMode.HALF_UP);
		return value.max(MIN_ODDS);
	}

	/** Puntos esperados por equipo a partir de la tabla y la ventaja de local. */
	public static double[] expectedPoints(TeamStrength home, TeamStrength away, double leagueAveragePerTeam,
			double homeAdvantage) {
		double homePoints = leagueAveragePerTeam * home.attack() * away.defense() * homeAdvantage;
		double awayPoints = leagueAveragePerTeam * away.attack() * home.defense() / homeAdvantage;
		return new double[] { clamp(homePoints, 70.0, 160.0), clamp(awayPoints, 70.0, 160.0) };
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

}
