package com.betpulse.collector;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.betpulse.collector.NormalizedBatch.Building;
import com.betpulse.collector.NormalizedBatch.Event;
import com.betpulse.collector.NormalizedBatch.Player;
import com.betpulse.collector.NormalizedBatch.Roshan;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

public final class GsiNormalizer {

	private static final Map<String, String> EVENT_TYPES = new LinkedHashMap<>();

	static {
		EVENT_TYPES.put("CHAT_MESSAGE_FIRSTBLOOD", "FIRST_BLOOD");
		EVENT_TYPES.put("CHAT_MESSAGE_HERO_KILL", "HERO_KILL");
		EVENT_TYPES.put("CHAT_MESSAGE_TOWER_KILL", "TOWER_KILL");
		EVENT_TYPES.put("CHAT_MESSAGE_ROSHAN_KILL", "ROSHAN_KILL");
		EVENT_TYPES.put("CHAT_MESSAGE_PAUSED", "PAUSE");
		EVENT_TYPES.put("CHAT_MESSAGE_UNPAUSED", "UNPAUSE");
	}

	private final ObjectMapper objectMapper;

	public GsiNormalizer(ObjectMapper objectMapper) {
		this.objectMapper = objectMapper;
	}

	public NormalizedBatch normalize(JsonNode root, UUID sessionId, UUID snapshotId, String capturedAt) {
		JsonNode map = root.path("map");
		String matchId = map.path("matchid").asText("");
		if (matchId.isBlank()) {
			return null;
		}
		int gameTime = Math.max(0, map.path("game_time").asInt(0));
		int clockTime = Math.max(0, map.path("clock_time").asInt(gameTime));
		JsonNode league = root.path("league");
		long leagueId = league.path("league_id").asLong(league.path("leagueid").asLong(0));
		String leagueName = text(league, "league_name", "name");

		return new NormalizedBatch(
				1,
				sessionId,
				snapshotId,
				matchId,
				capturedAt,
				clockTime,
				gameTime,
				map.path("game_state").asText("UNKNOWN"),
				map.path("paused").asBoolean(false),
				map.path("radiant_score").asInt(0),
				map.path("dire_score").asInt(0),
				defaultWinTeam(map.path("win_team").asText("none")),
				leagueId > 0 ? leagueId : null,
				leagueName,
				players(root.path("player")),
				buildings(root.path("buildings")),
				roshan(root.path("roshan")),
				events(root.path("events"), matchId));
	}

	private List<Player> players(JsonNode playerNode) {
		List<Player> players = new ArrayList<>();
		if (playerNode == null || playerNode.isMissingNode()) {
			return players;
		}
		JsonNode team2 = playerNode.path("team2");
		JsonNode team3 = playerNode.path("team3");
		if (!team2.isMissingNode() || !team3.isMissingNode()) {
			addTeam(players, team2, "radiant");
			addTeam(players, team3, "dire");
		} else if (playerNode.has("accountid") || playerNode.has("steamid")) {
			players.add(toPlayer(playerNode, normalizeTeam(playerNode.path("team_name").asText(""))));
		}
		return players;
	}

	private void addTeam(List<Player> players, JsonNode teamNode, String team) {
		if (teamNode == null || teamNode.isMissingNode()) {
			return;
		}
		teamNode.fields().forEachRemaining(entry -> players.add(toPlayer(entry.getValue(), team)));
	}

	private Player toPlayer(JsonNode node, String team) {
		return new Player(
				text(node, "accountid", "steamid"),
				node.path("name").asText(""),
				team,
				node.path("player_slot").asInt(0),
				node.path("kills").asInt(0),
				node.path("deaths").asInt(0),
				node.path("assists").asInt(0),
				node.path("last_hits").asInt(0),
				node.path("denies").asInt(0),
				node.path("gold").asLong(0),
				node.path("net_worth").asLong(0),
				node.path("gpm").asInt(0),
				node.path("xpm").asInt(0));
	}

	private List<Building> buildings(JsonNode buildingsNode) {
		List<Building> buildings = new ArrayList<>();
		if (buildingsNode == null || buildingsNode.isMissingNode()) {
			return buildings;
		}
		addBuildings(buildings, buildingsNode.path("radiant"));
		addBuildings(buildings, buildingsNode.path("dire"));
		return buildings;
	}

	private void addBuildings(List<Building> buildings, JsonNode sideNode) {
		if (sideNode == null || sideNode.isMissingNode()) {
			return;
		}
		sideNode.fields().forEachRemaining(entry -> {
			JsonNode building = entry.getValue();
			buildings.add(new Building(entry.getKey(), building.path("health").asInt(0),
					building.path("max_health").asInt(0)));
		});
	}

	private Roshan roshan(JsonNode roshanNode) {
		if (roshanNode == null || roshanNode.isMissingNode() || !roshanNode.has("alive")) {
			return null;
		}
		return new Roshan(roshanNode.path("alive").asBoolean(false),
				roshanNode.path("phase_time_remaining").asDouble(0));
	}

	private List<Event> events(JsonNode eventsNode, String matchId) {
		List<Event> events = new ArrayList<>();
		if (eventsNode == null || !eventsNode.isArray()) {
			return events;
		}
		for (JsonNode event : eventsNode) {
			if (!"generic_event".equals(event.path("event_type").asText())) {
				continue;
			}
			JsonNode data = parseData(event.path("data"));
			if (data == null) {
				continue;
			}
			String type = EVENT_TYPES.get(data.path("type").asText(""));
			if (type == null) {
				continue;
			}
			int clock = data.has("time") ? (int) Math.round(data.path("time").asDouble())
					: event.path("game_time").asInt(0);
			int player1 = data.path("playerid1").asInt(-1);
			int player2 = data.path("playerid2").asInt(-1);
			String eventId = matchId + ":" + type + ":" + clock + ":" + player1 + ":" + player2;
			events.add(new Event(eventId, type, clock, teamFor(player1), data));
		}
		return events;
	}

	private JsonNode parseData(JsonNode dataNode) {
		if (dataNode == null || dataNode.isMissingNode()) {
			return null;
		}
		try {
			if (dataNode.isTextual()) {
				return objectMapper.readTree(dataNode.asText());
			}
			return dataNode;
		} catch (Exception exception) {
			return null;
		}
	}

	private static String teamFor(int playerId) {
		if (playerId >= 0 && playerId <= 4) {
			return "radiant";
		}
		if (playerId >= 5) {
			return "dire";
		}
		return null;
	}

	private static String normalizeTeam(String team) {
		if (team == null) {
			return "radiant";
		}
		return "dire".equalsIgnoreCase(team) ? "dire" : "radiant";
	}

	private static String defaultWinTeam(String winTeam) {
		return winTeam == null || winTeam.isBlank() ? "none" : winTeam;
	}

	private static String text(JsonNode node, String... keys) {
		for (String key : keys) {
			JsonNode value = node.path(key);
			if (!value.isMissingNode() && !value.asText("").isBlank()) {
				return value.asText();
			}
		}
		return null;
	}

}
