package com.betpulse.live;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.JsonNode;

public final class IngestDtos {

	private IngestDtos() {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Batch(
			Integer schemaVersion,
			UUID sessionId,
			UUID snapshotId,
			String matchId,
			Instant capturedAt,
			Integer clockTime,
			Integer gameTime,
			String gameState,
			Boolean paused,
			Integer radiantScore,
			Integer direScore,
			String winTeam,
			Long leagueId,
			String leagueName,
			List<Player> players,
			List<Building> buildings,
			Roshan roshan,
			List<Event> events) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Player(
			String accountId,
			String name,
			String team,
			Integer slot,
			Integer kills,
			Integer deaths,
			Integer assists,
			Integer lastHits,
			Integer denies,
			Long gold,
			Long netWorth,
			Integer gpm,
			Integer xpm) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Building(String name, Integer health, Integer maxHealth) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Roshan(Boolean alive, Double phaseTimeRemaining) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Event(String eventId, String type, Integer clockTime, String team, JsonNode payload) {
	}

	public record Result(int snapshotsInserted, int eventsInserted) {
	}

}
