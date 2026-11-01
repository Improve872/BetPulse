package com.betpulse.markets;

import java.math.BigDecimal;
import java.math.RoundingMode;

import org.springframework.stereotype.Component;

/**
 * Reglas puras de resolución por tipo de mercado. Consume un resultado ya
 * resuelto de la partida; no consulta OpenDota ni GSI.
 */
@Component
public class MarketOutcomeResolver {

	public Resolution resolve(String marketKey, BigDecimal line, String matchStatus, Boolean radiantWin,
			Integer radiantScore, Integer direScore, Integer durationSeconds) {
		if ("VOID".equals(matchStatus)) {
			return Resolution.voidedResolution();
		}
		MarketKind kind;
		try {
			kind = MarketKind.valueOf(marketKey);
		} catch (RuntimeException exception) {
			return Resolution.voidedResolution();
		}
		return resolve(kind, line, radiantWin, radiantScore, direScore, durationSeconds);
	}

	public Resolution resolve(MarketKind kind, BigDecimal line, Boolean radiantWin, Integer radiantScore,
			Integer direScore, Integer durationSeconds) {
		return switch (kind) {
			case MATCH_WINNER -> matchWinner(radiantWin);
			case TOTAL_KILLS -> totalKills(line, radiantScore, direScore);
			case KILL_HANDICAP -> killHandicap(line, radiantScore, direScore);
			case DURATION -> duration(line, durationSeconds);
		};
	}

	private Resolution matchWinner(Boolean radiantWin) {
		if (radiantWin == null) {
			return Resolution.voidedResolution();
		}
		return Resolution.settled(radiantWin ? "RADIANT" : "DIRE");
	}

	private Resolution totalKills(BigDecimal line, Integer radiantScore, Integer direScore) {
		if (line == null || radiantScore == null || direScore == null) {
			return Resolution.voidedResolution();
		}
		BigDecimal total = BigDecimal.valueOf((long) radiantScore + direScore);
		return Resolution.settled(total.compareTo(line) > 0 ? "OVER" : "UNDER");
	}

	private Resolution killHandicap(BigDecimal line, Integer radiantScore, Integer direScore) {
		if (line == null || radiantScore == null || direScore == null) {
			return Resolution.voidedResolution();
		}
		BigDecimal difference = BigDecimal.valueOf((long) radiantScore - direScore);
		return Resolution.settled(difference.compareTo(line) > 0 ? "RADIANT" : "DIRE");
	}

	private Resolution duration(BigDecimal line, Integer durationSeconds) {
		if (line == null || durationSeconds == null) {
			return Resolution.voidedResolution();
		}
		BigDecimal minutes = BigDecimal.valueOf(durationSeconds)
				.divide(BigDecimal.valueOf(60), 6, RoundingMode.HALF_UP);
		return Resolution.settled(minutes.compareTo(line) > 0 ? "OVER" : "UNDER");
	}

	public record Resolution(boolean voided, String winningSelectionKey) {

		public static Resolution settled(String winningSelectionKey) {
			return new Resolution(false, winningSelectionKey);
		}

		public static Resolution voidedResolution() {
			return new Resolution(true, null);
		}

	}

}
