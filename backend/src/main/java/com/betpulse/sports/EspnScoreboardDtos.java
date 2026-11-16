package com.betpulse.sports;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Subconjunto del scoreboard de ESPN que usa BetPulse. Los campos no
 * declarados se ignoran para tolerar cambios del proveedor.
 */
public final class EspnScoreboardDtos {

	private EspnScoreboardDtos() {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Scoreboard(List<League> leagues, List<Event> events) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record League(String id, String name, String slug, String abbreviation) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Event(String id, String date, String name, Status status, List<Competition> competitions) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Competition(String id, String date, Status status, Venue venue, List<Competitor> competitors) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Competitor(String homeAway, String score, Boolean winner, Team team) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Team(String id, String displayName, String shortDisplayName, String abbreviation, String logo) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Venue(String fullName) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Status(String displayClock, Type type) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Type(String name, String state, Boolean completed, String detail, String shortDetail) {
	}

}
