package com.betpulse.sports;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.Test;

import com.betpulse.markets.TeamStrength;
import com.betpulse.sports.EspnStandingsDtos.Child;
import com.betpulse.sports.EspnStandingsDtos.Entry;
import com.betpulse.sports.EspnStandingsDtos.Standings;
import com.betpulse.sports.EspnStandingsDtos.StandingsInfo;
import com.betpulse.sports.EspnStandingsDtos.Stat;
import com.betpulse.sports.EspnStandingsDtos.TeamRef;

class BasketballStrengthServiceTest {

	private static final Instant NOW = Instant.parse("2026-11-24T12:00:00Z");

	private final EspnStandingsClient client = mock(EspnStandingsClient.class);
	private final BasketballProperties properties = new BasketballProperties();
	private final Clock clock = Clock.fixed(NOW, ZoneOffset.UTC);

	@Test
	void derivesGamesPlayedFromRecordWhenEspnOmitsIt() {
		when(client.fetchForSport("basketball", "nba")).thenReturn(standings());
		BasketballStrengthService service = new BasketballStrengthService(client, properties, clock);

		BasketballStrengthService.LeagueStrength strength = service.strength("nba");
		TeamStrength strong = service.team(strength, 1);
		TeamStrength weak = service.team(strength, 2);

		assertThat(strength.averagePerTeam()).isGreaterThan(100.0);
		assertThat(strong.played()).isEqualTo(12);
		assertThat(strong.attack()).isGreaterThan(1.0);
		assertThat(weak.attack()).isLessThan(1.0);
		assertThat(strong.attack()).isGreaterThan(weak.attack());
	}

	private static Standings standings() {
		return new Standings("nba", "NBA", List.of(
				new Child(new StandingsInfo(List.of(
						entry("1", 10, 2, 2_400, 2_000),
						entry("2", 2, 10, 2_000, 2_400))))));
	}

	private static Entry entry(String id, double wins, double losses, double pointsFor,
			double pointsAgainst) {
		return new Entry(new TeamRef(id, "Team " + id), List.of(
				new Stat("wins", wins),
				new Stat("losses", losses),
				new Stat("pointsFor", pointsFor),
				new Stat("pointsAgainst", pointsAgainst)));
	}

}
