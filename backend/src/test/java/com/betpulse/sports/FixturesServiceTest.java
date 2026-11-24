package com.betpulse.sports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.betpulse.sports.EspnScoreboardDtos.Competition;
import com.betpulse.sports.EspnScoreboardDtos.Competitor;
import com.betpulse.sports.EspnScoreboardDtos.Event;
import com.betpulse.sports.EspnScoreboardDtos.League;
import com.betpulse.sports.EspnScoreboardDtos.Scoreboard;
import com.betpulse.sports.EspnScoreboardDtos.Status;
import com.betpulse.sports.EspnScoreboardDtos.Team;
import com.betpulse.sports.EspnScoreboardDtos.Type;
import com.betpulse.sports.EspnScoreboardDtos.Venue;

class FixturesServiceTest {

	private static final Instant START = Instant.parse("2026-11-16T00:00:00Z");

	private final EspnScoreboardClient client = mock(EspnScoreboardClient.class);
	private final EspnFixtureMapper mapper = new EspnFixtureMapper();
	private final TestClock clock = new TestClock(START);

	@Test
	void aggregatesLeaguesAndReportsLiveFeed() {
		EspnProperties properties = properties();
		when(client.fetch(eq("eng.1"), any(java.time.YearMonth.class))).thenReturn(scoreboard("eng-1"));
		when(client.fetch(eq("esp.1"), any(java.time.YearMonth.class))).thenReturn(scoreboard("esp-1"));

		FixturesService service = new FixturesService(client, mapper, properties, clock);
		service.refresh();

		var response = service.getFixtures();
		assertThat(response.sport()).isEqualTo("SOCCER");
		assertThat(response.status()).isEqualTo("LIVE");
		assertThat(response.lastError()).isNull();
		assertThat(response.leagues()).hasSize(2);
		assertThat(response.leagues().get(0).fixtures()).hasSize(1);
	}

	@Test
	void keepsLastGoodFixturesWhenOneLeagueFails() {
		EspnProperties properties = properties();
		when(client.fetch(eq("eng.1"), any(java.time.YearMonth.class))).thenReturn(scoreboard("eng-1"));
		when(client.fetch(eq("esp.1"), any(java.time.YearMonth.class))).thenReturn(scoreboard("esp-1"));

		FixturesService service = new FixturesService(client, mapper, properties, clock);
		service.refresh();

		clock.advance(Duration.ofMinutes(30));
		when(client.fetch(eq("esp.1"), any(java.time.YearMonth.class))).thenThrow(new RuntimeException("ESPN caído"));
		service.refresh();

		var response = service.getFixtures();
		assertThat(response.leagues()).hasSize(2);
		assertThat(response.leagues().get(1).fixtures()).hasSize(1);
		assertThat(response.lastError()).contains("ESPN caído");
		assertThat(response.status()).isEqualTo("LIVE");
	}

	@Test
	void marksTheFeedStaleWhenNothingSucceeds() {
		EspnProperties properties = properties();
		when(client.fetch(eq("eng.1"), any(java.time.YearMonth.class))).thenReturn(scoreboard("eng-1"));
		when(client.fetch(eq("esp.1"), any(java.time.YearMonth.class))).thenReturn(scoreboard("esp-1"));

		FixturesService service = new FixturesService(client, mapper, properties, clock);
		service.refresh();

		clock.advance(Duration.ofHours(2));
		when(client.fetch(eq("eng.1"), any(java.time.YearMonth.class))).thenThrow(new RuntimeException("timeout"));
		when(client.fetch(eq("esp.1"), any(java.time.YearMonth.class))).thenThrow(new RuntimeException("timeout"));
		service.refresh();

		var response = service.getFixtures();
		assertThat(response.status()).isEqualTo("STALE");
		assertThat(response.leagues()).hasSize(2);
	}

	private static EspnProperties properties() {
		EspnProperties properties = new EspnProperties();
		properties.setLeagues(List.of(
				new EspnProperties.League("eng.1", "Premier League"),
				new EspnProperties.League("esp.1", "LaLiga")));
		properties.setPollInterval(Duration.ofMinutes(5));
		properties.setStaleAfter(Duration.ofMinutes(20));
		return properties;
	}

	private static Scoreboard scoreboard(String suffix) {
		Status status = new Status("0'", new Type("STATUS_SCHEDULED", "pre", false, "Scheduled", "Scheduled"));
		Competitor home = new Competitor("home", "0", null, new Team("1", "Home FC", "Home", "HOM", null));
		Competitor away = new Competitor("away", "0", null, new Team("2", "Away FC", "Away", "AWY", null));
		Competition competition = new Competition("1", "2026-11-21T12:30Z", status, new Venue("Stadium"),
				List.of(home, away));
		Event event = new Event("event-" + suffix, "2026-11-21T12:30Z", "Home at Away", status,
				List.of(competition));
		League league = new League("1", "League", "eng.1", "L");
		return new Scoreboard(List.of(league), List.of(event));
	}

	private static final class TestClock extends Clock {

		private Instant instant;

		TestClock(Instant instant) {
			this.instant = instant;
		}

		void advance(Duration duration) {
			instant = instant.plus(duration);
		}

		@Override
		public ZoneId getZone() {
			return ZoneOffset.UTC;
		}

		@Override
		public Clock withZone(ZoneId zone) {
			return this;
		}

		@Override
		public Instant instant() {
			return instant;
		}

	}

}
