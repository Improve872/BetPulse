package com.betpulse.collector;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.databind.JsonNode;

public record NormalizedBatch(
		int schemaVersion,
		UUID sessionId,
		UUID snapshotId,
		String matchId,
		String capturedAt,
		int clockTime,
		int gameTime,
		String gameState,
		boolean paused,
		int radiantScore,
		int direScore,
		String winTeam,
		Long leagueId,
		String leagueName,
		List<Player> players,
		List<Building> buildings,
		Roshan roshan,
		List<Event> events) {

	public NormalizedBatch with(UUID newSnapshotId, List<Event> newEvents) {
		return new NormalizedBatch(schemaVersion, sessionId, newSnapshotId, matchId, capturedAt, clockTime, gameTime,
				gameState, paused, radiantScore, direScore, winTeam, leagueId, leagueName, players, buildings,
				roshan, newEvents);
	}

	public record Player(String accountId, String name, String team, Integer slot, Integer kills, Integer deaths,
			Integer assists, Integer lastHits, Integer denies, Long gold, Long netWorth, Integer gpm, Integer xpm) {
	}

	public record Building(String name, Integer health, Integer maxHealth) {
	}

	public record Roshan(Boolean alive, Double phaseTimeRemaining) {
	}

	public record Event(String eventId, String type, Integer clockTime, String team, JsonNode payload) {
	}

}
