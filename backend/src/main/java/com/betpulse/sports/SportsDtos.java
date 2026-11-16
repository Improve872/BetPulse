package com.betpulse.sports;

import java.time.Instant;
import java.util.List;

public final class SportsDtos {

	private SportsDtos() {
	}

	public record FixturesResponse(String sport, Instant updatedAt, String status, Instant lastSuccessAt,
			String lastError, List<LeagueFixtures> leagues) {
	}

	public record LeagueFixtures(String id, String name, List<FixtureView> fixtures) {
	}

	public record FixtureView(String id, String leagueId, String leagueName, Instant kickoff, String state,
			String statusDetail, FixtureTeam home, FixtureTeam away, Integer homeScore, Integer awayScore,
			String venue) {
	}

	public record FixtureTeam(long id, String name, String shortName, String abbreviation, String crestUrl) {
	}

}
