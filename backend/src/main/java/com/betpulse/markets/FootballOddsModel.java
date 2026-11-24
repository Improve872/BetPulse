package com.betpulse.markets;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;

import org.springframework.stereotype.Component;

import com.betpulse.markets.OddsEngine.Quote;

/**
 * Modelo Poisson pre-partida de fútbol. Recibe los goles esperados de cada
 * equipo (derivados de la tabla real de ESPN) y calcula probabilidades de
 * 1X2 y de total de goles. No consulta fuentes externas ni inventa datos.
 */
@Component
public class FootballOddsModel {

	private static final int MAX_GOALS = 10;
	private static final double MIN_PROBABILITY = 0.02;
	private static final double MAX_PROBABILITY = 0.96;
	private static final BigDecimal ONE = BigDecimal.ONE;
	private static final BigDecimal MIN_ODDS = new BigDecimal("1.001");

	private final OddsProperties properties;

	public FootballOddsModel(OddsProperties properties) {
		this.properties = properties;
	}

	public List<Quote> quotes(FootballMarketKind kind, BigDecimal line, double homeExpected, double awayExpected) {
		return switch (kind) {
			case MATCH_RESULT_1X2 -> matchResult(homeExpected, awayExpected);
			case TOTAL_GOALS -> totalGoals(line, homeExpected, awayExpected);
		};
	}

	/** Línea de total de goles en medio punto, cercana a los goles esperados. */
	public BigDecimal totalLine(double homeExpected, double awayExpected) {
		double expected = homeExpected + awayExpected;
		double line = Math.round(expected * 2.0) / 2.0;
		if (Math.abs(line - Math.rint(line)) < 1e-9) {
			line += 0.5;
		}
		return BigDecimal.valueOf(Math.max(1.5, line)).setScale(1, RoundingMode.HALF_UP);
	}

	private List<Quote> matchResult(double homeExpected, double awayExpected) {
		double[][] matrix = scoreMatrix(homeExpected, awayExpected);
		double home = 0;
		double draw = 0;
		double away = 0;
		for (int h = 0; h < matrix.length; h++) {
			for (int a = 0; a < matrix.length; a++) {
				double probability = matrix[h][a];
				if (h > a) {
					home += probability;
				} else if (h == a) {
					draw += probability;
				} else {
					away += probability;
				}
			}
		}
		double[] normalized = normalize(new double[] { home, draw, away });
		return List.of(
				quote("HOME", normalized[0]),
				quote("DRAW", normalized[1]),
				quote("AWAY", normalized[2]));
	}

	private List<Quote> totalGoals(BigDecimal line, double homeExpected, double awayExpected) {
		if (line == null) {
			throw new IllegalArgumentException("Total de goles requiere línea");
		}
		double threshold = line.doubleValue();
		double[][] matrix = scoreMatrix(homeExpected, awayExpected);
		double over = 0;
		for (int h = 0; h < matrix.length; h++) {
			for (int a = 0; a < matrix.length; a++) {
				if (h + a > threshold) {
					over += matrix[h][a];
				}
			}
		}
		double overProbability = clamp(over, MIN_PROBABILITY, MAX_PROBABILITY);
		return List.of(quote("OVER", overProbability), quote("UNDER", 1.0 - overProbability));
	}

	/** Probabilidad sin margen de cada resultado; solo para tests y auditoría. */
	public double[] fairProbabilities(double homeExpected, double awayExpected) {
		double[][] matrix = scoreMatrix(homeExpected, awayExpected);
		double home = 0;
		double draw = 0;
		double away = 0;
		for (int h = 0; h < matrix.length; h++) {
			for (int a = 0; a < matrix.length; a++) {
				if (h > a) {
					home += matrix[h][a];
				} else if (h == a) {
					draw += matrix[h][a];
				} else {
					away += matrix[h][a];
				}
			}
		}
		return normalize(new double[] { home, draw, away });
	}

	private double[][] scoreMatrix(double homeExpected, double awayExpected) {
		double homeLambda = clamp(homeExpected, 0.15, 6.0);
		double awayLambda = clamp(awayExpected, 0.15, 6.0);
		double[] home = poissonPmf(homeLambda);
		double[] away = poissonPmf(awayLambda);
		double[][] matrix = new double[MAX_GOALS + 1][MAX_GOALS + 1];
		for (int h = 0; h <= MAX_GOALS; h++) {
			for (int a = 0; a <= MAX_GOALS; a++) {
				matrix[h][a] = home[h] * away[a];
			}
		}
		return matrix;
	}

	private static double[] poissonPmf(double lambda) {
		double[] pmf = new double[MAX_GOALS + 1];
		double term = Math.exp(-lambda);
		pmf[0] = term;
		for (int k = 1; k <= MAX_GOALS; k++) {
			term *= lambda / k;
			pmf[k] = term;
		}
		return pmf;
	}

	private static double[] normalize(double[] values) {
		double[] clamped = new double[values.length];
		double sum = 0;
		for (int index = 0; index < values.length; index++) {
			clamped[index] = clamp(values[index], MIN_PROBABILITY, MAX_PROBABILITY);
			sum += clamped[index];
		}
		for (int index = 0; index < clamped.length; index++) {
			clamped[index] = clamped[index] / sum;
		}
		return clamped;
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

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	/** Goles esperados por equipo a partir de la tabla y la ventaja de local. */
	public static double[] expectedGoals(TeamStrength home, TeamStrength away, double leagueAveragePerTeam,
			double homeAdvantage) {
		double homeAttack = home.attack();
		double homeDefense = home.defense();
		double awayAttack = away.attack();
		double awayDefense = away.defense();
		double homeLambda = leagueAveragePerTeam * homeAttack * awayDefense * homeAdvantage;
		double awayLambda = leagueAveragePerTeam * awayAttack * homeDefense / homeAdvantage;
		return new double[] { clamp(homeLambda, 0.2, 5.0), clamp(awayLambda, 0.2, 5.0) };
	}

	public record TeamStrength(double attack, double defense, int played) {

		public static TeamStrength neutral() {
			return new TeamStrength(1.0, 1.0, 0);
		}

	}

}
