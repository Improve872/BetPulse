package com.betpulse.sports;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.betpulse.sports.EspnScoreboardDtos.Competition;
import com.betpulse.sports.EspnScoreboardDtos.Competitor;
import com.betpulse.sports.EspnScoreboardDtos.Event;
import com.betpulse.sports.EspnScoreboardDtos.Scoreboard;
import com.betpulse.sports.EspnScoreboardDtos.Status;
import com.betpulse.sports.EspnScoreboardDtos.Team;
import com.betpulse.sports.EspnScoreboardDtos.Type;
import com.betpulse.sports.EspnScoreboardDtos.Venue;
import com.betpulse.sports.SportsDtos.FixtureView;
import com.fasterxml.jackson.databind.ObjectMapper;

class EspnFixtureMapperTest {

	private static final Instant NOW = Instant.parse("2026-11-16T00:00:00Z");
	private static final EspnProperties.League PREMIER = new EspnProperties.League("eng.1", "Premier League");

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final EspnFixtureMapper mapper = new EspnFixtureMapper();

	@Test
	void mapsRealEspnScoreboardToFixtures() throws Exception {
		var fixtures = mapper.map(PREMIER, loadScoreboard(), NOW, 10);

		assertThat(fixtures).hasSize(3);
		FixtureView first = fixtures.get(0);
		assertThat(first.id()).isNotBlank();
		assertThat(first.leagueId()).isEqualTo("eng.1");
		assertThat(first.leagueName()).isEqualTo("Premier League");
		assertThat(first.kickoff()).isAfter(NOW);
		assertThat(first.state()).isEqualTo("SCHEDULED");
		assertThat(first.home().name()).isNotBlank();
		assertThat(first.away().name()).isNotBlank();
		assertThat(first.homeScore()).isNull();
		assertThat(first.awayScore()).isNull();
		assertThat(first.venue()).isNotBlank();
		assertThat(fixtures).extracting(FixtureView::kickoff).isSorted();
	}

	@Test
	void ignoresMatchesOutsideTheHorizon() throws Exception {
		assertThat(mapper.map(PREMIER, loadScoreboard(), NOW, 1)).isEmpty();
	}

	@Test
	void doesNotPublishLiveOrFinishedMatches() {
		var scoreboard = new Scoreboard(null, java.util.List.of(
				event("live", "in", false),
				event("finished", "post", true),
				event("scheduled", "pre", false)));

		var fixtures = mapper.map(PREMIER, scoreboard, NOW, 10);

		assertThat(fixtures).hasSize(1);
		assertThat(fixtures.get(0).id()).isEqualTo("scheduled");
	}

	private Scoreboard loadScoreboard() throws Exception {
		try (InputStream stream = getClass().getResourceAsStream("/espn/scoreboard-eng1.json")) {
			assertThat(stream).as("fixture real de ESPN").isNotNull();
			return objectMapper.readValue(stream, Scoreboard.class);
		}
	}

	private static Event event(String id, String state, boolean completed) {
		Status status = new Status("0'", new Type("STATUS", state, completed, "detail", "short"));
		return new Event(
				id,
				"2026-11-21T12:30Z",
				"Test",
				status,
				java.util.List.of(new Competition(
						"1",
						"2026-11-21T12:30Z",
						status,
						new Venue("Test Stadium"),
						java.util.List.of(
								new Competitor("home", "0", false, new Team("1", "Home FC", "Home", "HOM", null)),
								new Competitor("away", "0", false, new Team("2", "Away FC", "Away", "AWY", null))))));
	}

}
