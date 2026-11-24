package com.betpulse.sports;

import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

import org.springframework.stereotype.Component;

import com.betpulse.sports.EspnScoreboardDtos.Competition;
import com.betpulse.sports.EspnScoreboardDtos.Competitor;
import com.betpulse.sports.EspnScoreboardDtos.Event;
import com.betpulse.sports.EspnScoreboardDtos.Scoreboard;
import com.betpulse.sports.SportsDtos.FixtureTeam;
import com.betpulse.sports.SportsDtos.FixtureView;

/**
 * Normaliza el scoreboard de ESPN a fixtures propias. Solo se publican
 * partidos programados: BetPulse no ofrece cobertura en vivo de fútbol.
 */
@Component
public class EspnFixtureMapper {

	public List<FixtureView> map(EspnProperties.League league, Scoreboard scoreboard, Instant now, int horizonDays) {
		if (scoreboard == null || scoreboard.events() == null) {
			return List.of();
		}
		Instant limit = now.plus(Duration.ofDays(Math.max(1, horizonDays)));
		return scoreboard.events().stream()
				.map(event -> toFixture(league, event))
				.filter(Objects::nonNull)
				.filter(fixture -> !fixture.kickoff().isAfter(limit))
				.filter(fixture -> "SCHEDULED".equals(fixture.state()))
				.sorted(Comparator.comparing(FixtureView::kickoff))
				.toList();
	}

	private FixtureView toFixture(EspnProperties.League league, Event event) {
		if (event == null || event.id() == null || event.competitions() == null || event.competitions().isEmpty()) {
			return null;
		}
		Competition competition = event.competitions().get(0);
		if (competition.competitors() == null || competition.competitors().size() < 2) {
			return null;
		}
		Competitor home = find(competition, "home");
		Competitor away = find(competition, "away");
		if (home == null || away == null) {
			return null;
		}
		Instant kickoff = parseInstant(event.date() != null ? event.date() : competition.date());
		if (kickoff == null) {
			return null;
		}
		String state = mapState(competition.status() != null ? competition.status() : event.status());
		boolean started = !"SCHEDULED".equals(state);
		String detail = competition.status() != null && competition.status().type() != null
				? competition.status().type().shortDetail()
				: null;

		return new FixtureView(
				event.id(),
				league.getSlug(),
				league.getName(),
				kickoff,
				state,
				detail,
				team(home),
				team(away),
				started ? parseScore(home.score()) : null,
				started ? parseScore(away.score()) : null,
				competition.venue() != null ? competition.venue().fullName() : null,
				List.of());
	}

	private static Competitor find(Competition competition, String side) {
		return competition.competitors().stream()
				.filter(competitor -> side.equals(competitor.homeAway()))
				.findFirst()
				.orElse(null);
	}

	private static FixtureTeam team(Competitor competitor) {
		EspnScoreboardDtos.Team team = competitor.team();
		if (team == null) {
			return new FixtureTeam(0, "Equipo", null, null, null);
		}
		return new FixtureTeam(
				parseId(team.id()),
				team.displayName(),
				team.shortDisplayName(),
				team.abbreviation(),
				team.logo());
	}

	private static String mapState(EspnScoreboardDtos.Status status) {
		if (status == null || status.type() == null) {
			return "SCHEDULED";
		}
		String state = status.type().state();
		if ("in".equals(state)) {
			return "LIVE";
		}
		if ("post".equals(state) || Boolean.TRUE.equals(status.type().completed())) {
			return "FINISHED";
		}
		return "SCHEDULED";
	}

	private static Instant parseInstant(String value) {
		if (value == null || value.isBlank()) {
			return null;
		}
		try {
			// ESPN envía fechas sin segundos ("2026-11-21T12:30Z"); Instant.parse
			// las rechaza porque exige el campo de segundos.
			return java.time.OffsetDateTime.parse(value).toInstant();
		} catch (RuntimeException exception) {
			return null;
		}
	}

	private static long parseId(String value) {
		try {
			return value == null ? 0 : Long.parseLong(value);
		} catch (NumberFormatException exception) {
			return 0;
		}
	}

	private static Integer parseScore(String value) {
		try {
			return value == null || value.isBlank() ? null : Integer.valueOf(value);
		} catch (NumberFormatException exception) {
			return null;
		}
	}

}
