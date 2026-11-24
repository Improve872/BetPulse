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
			String venue, List<FixtureMarket> markets) {

		public FixtureView withMarkets(List<FixtureMarket> values) {
			return new FixtureView(id, leagueId, leagueName, kickoff, state, statusDetail, home, away, homeScore,
					awayScore, venue, values);
		}

	}

	public record FixtureMarket(String id, String marketKey, String title, java.math.BigDecimal line, int version,
			String status, List<FixtureSelection> selections) {
	}

	public record FixtureSelection(String key, String label, java.math.BigDecimal probability,
			java.math.BigDecimal odds) {
	}

	public record FixtureTeam(long id, String name, String shortName, String abbreviation, String crestUrl) {
	}

}
