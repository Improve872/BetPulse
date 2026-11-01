package com.betpulse.live;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import com.betpulse.catalog.OpenDotaDtos.MatchDetails;

public interface MatchResultStore {

	int enqueueClosedMatchesWithoutResult();

	List<PendingResult> findPending(Instant dueAt, int limit);

	Optional<MatchResultRow> find(String matchId);

	void markReady(String matchId, MatchDetails details, String objectivesJson, Instant now);

	void markFailure(String matchId, String error, Instant nextAttemptAt, boolean terminal, Instant now);

	record PendingResult(String matchId, int attempts) {
	}

	record MatchResultRow(String matchId, String status, Boolean radiantWin, Integer radiantScore, Integer direScore,
			Long durationSeconds, Long firstBloodTime, Long leagueId, Instant resolvedAt, int attempts,
			String lastError) {
	}

}
