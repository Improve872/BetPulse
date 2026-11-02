package com.betpulse.markets;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Reglas puras de resolución por tipo de mercado. Consume un resultado ya
 * resuelto de la partida; no consulta OpenDota ni GSI.
 */
@Component
public class MarketOutcomeResolver {

	private final ObjectMapper objectMapper;

	public MarketOutcomeResolver(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public Resolution resolve(String marketKey, BigDecimal line, String matchStatus, Boolean radiantWin,
			Integer radiantScore, Integer direScore, Integer durationSeconds, String objectivesJson,
			Instant openedAt) {
		if ("VOID".equals(matchStatus)) {
			return Resolution.voidedResolution();
		}
		MarketKind kind;
		try {
			kind = MarketKind.valueOf(marketKey);
		} catch (RuntimeException exception) {
			return Resolution.voidedResolution();
		}
		return resolve(kind, line, radiantWin, radiantScore, direScore, durationSeconds, objectivesJson, openedAt);
	}

	public Resolution resolve(String marketKey, BigDecimal line, String matchStatus, Boolean radiantWin,
			Integer radiantScore, Integer direScore, Integer durationSeconds) {
		return resolve(marketKey, line, matchStatus, radiantWin, radiantScore, direScore, durationSeconds, null, null);
	}

	public Resolution resolve(MarketKind kind, BigDecimal line, Boolean radiantWin, Integer radiantScore,
			Integer direScore, Integer durationSeconds) {
		return resolve(kind, line, radiantWin, radiantScore, direScore, durationSeconds, null, null);
	}

	public Resolution resolve(MarketKind kind, BigDecimal line, Boolean radiantWin, Integer radiantScore,
			Integer direScore, Integer durationSeconds, String objectivesJson, Instant openedAt) {
		return switch (kind) {
			case MATCH_WINNER -> matchWinner(radiantWin);
			case TOTAL_KILLS -> totalKills(line, radiantScore, direScore);
			case KILL_HANDICAP -> killHandicap(line, radiantScore, direScore);
			case DURATION -> duration(line, durationSeconds);
			case FIRST_BLOOD -> eventWinner(objectivesJson, "FIRST_BLOOD", null);
			case FIRST_TOWER -> eventWinner(objectivesJson, "TOWER_KILL", null);
			case NEXT_ROSHAN -> eventWinner(objectivesJson, "ROSHAN_KILL", openedAt);
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

	private Resolution eventWinner(String objectivesJson, String eventType, Instant since) {
		if (objectivesJson == null || objectivesJson.isBlank()) {
			return Resolution.voidedResolution();
		}
		try {
			JsonNode root = objectMapper.readTree(objectivesJson);
			if (!root.isArray()) {
				return Resolution.voidedResolution();
			}
			for (JsonNode node : root) {
				if (!eventType.equals(mapType(node.path("type").asText("")))) {
					continue;
				}
				if (since != null && !after(node, since)) {
					continue;
				}
				String team = team(node);
				if (team != null) {
					return Resolution.settled(team);
				}
			}
		} catch (Exception exception) {
			return Resolution.voidedResolution();
		}
		return Resolution.voidedResolution();
	}

	private static boolean after(JsonNode node, Instant since) {
		JsonNode receivedAt = node.path("receivedAt");
		if (!receivedAt.isTextual()) {
			return true;
		}
		try {
			return !Instant.parse(receivedAt.asText()).isBefore(since);
		} catch (RuntimeException exception) {
			return true;
		}
	}

	private static String mapType(String raw) {
		return switch (raw) {
			case "FIRST_BLOOD", "CHAT_MESSAGE_FIRSTBLOOD" -> "FIRST_BLOOD";
			case "TOWER_KILL", "building_kill" -> "TOWER_KILL";
			case "ROSHAN_KILL", "CHAT_MESSAGE_ROSHAN_KILL" -> "ROSHAN_KILL";
			default -> "";
		};
	}

	private static String team(JsonNode node) {
		String team = node.path("team").asText("");
		if ("radiant".equalsIgnoreCase(team)) {
			return "RADIANT";
		}
		if ("dire".equalsIgnoreCase(team)) {
			return "DIRE";
		}
		int numericTeam = node.path("team").asInt(-1);
		if (numericTeam == 2) {
			return "RADIANT";
		}
		if (numericTeam == 3) {
			return "DIRE";
		}
		int slot = node.path("slot").asInt(-1);
		if (slot >= 0 && slot <= 4) {
			return "RADIANT";
		}
		if (slot >= 5 && slot <= 127) {
			return "DIRE";
		}
		String key = node.path("key").asText("");
		if (key.contains("badguys")) {
			return "RADIANT";
		}
		if (key.contains("goodguys")) {
			return "DIRE";
		}
		return null;
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
