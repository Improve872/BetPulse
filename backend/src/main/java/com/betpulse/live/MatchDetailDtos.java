package com.betpulse.live;

import java.util.List;

import com.betpulse.catalog.LobbyDtos.LobbyMatch;

public final class MatchDetailDtos {

	private MatchDetailDtos() {
	}

	public record MatchDetail(LobbyMatch match, List<EventView> events, List<PlayerView> players,
			List<BuildingView> buildings, RoshanView roshan) {
	}

	public record EventView(String id, String type, int clockTime, String team) {
	}

	public record PlayerView(String accountId, String name, String team, Integer slot, Integer kills, Integer deaths,
			Integer assists, Integer lastHits, Integer denies, Long netWorth, Integer gpm, Integer xpm) {
	}

	public record BuildingView(String name, Integer health, Integer maxHealth) {
	}

	public record RoshanView(Boolean alive, Double phaseTimeRemaining) {
	}

}
