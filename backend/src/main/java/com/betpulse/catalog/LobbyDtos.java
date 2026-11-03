package com.betpulse.catalog;

import java.time.Instant;
import java.util.List;

import com.fasterxml.jackson.annotation.JsonInclude;

public final class LobbyDtos {

	private LobbyDtos() {
	}

	public record LobbyResponse(List<LobbyMatch> live, List<LobbyMatch> recent, Instant updatedAt,
			FeedHealth feed) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record LobbyMatch(String id, String game, String state, String tournament, String tournamentKind,
			String format, long startedAt, long durationSeconds, LobbyTeam radiant, LobbyTeam dire,
			Integer averageMmr, Integer spectators, Integer delaySeconds, String source, String playersScope,
			Boolean paused, Boolean roshanAvailable) {
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record LobbyTeam(String name, int score, String side, Boolean winner, Long teamId) {

		public LobbyTeam(String name, int score, String side, Boolean winner) {
			this(name, score, side, winner, null);
		}
	}

	@JsonInclude(JsonInclude.Include.NON_NULL)
	public record FeedHealth(String source, String status, Instant lastSuccessAt, Instant lastAttemptAt,
			Instant nextAttemptAt, int consecutiveFailures, String lastError, boolean stale) {
	}

}
