package com.betpulse.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.betpulse.catalog.OpenDotaDtos.Team;

@ExtendWith(MockitoExtension.class)
class TeamLogoCacheTest {

	@Mock
	private OpenDotaClient openDotaClient;

	private MutableClock clock;
	private TeamLogoCache cache;

	@BeforeEach
	void setUp() {
		clock = new MutableClock(Instant.parse("2026-11-03T12:00:00Z"));
		cache = new TeamLogoCache(openDotaClient, clock);
	}

	@Test
	void resolvesAndCachesLogoUrl() {
		when(openDotaClient.fetchTeam(101L))
				.thenReturn(new Team(101L, "Team A", "TA", "https://cdn.example.com/a.png"));

		assertThat(cache.logoUrl(101L)).isEqualTo("https://cdn.example.com/a.png");
		assertThat(cache.logoUrl(101L)).isEqualTo("https://cdn.example.com/a.png");
		verify(openDotaClient, times(1)).fetchTeam(101L);
	}

	@Test
	void cachesMissingLogoAndRetriesAfterNegativeTtl() {
		when(openDotaClient.fetchTeam(202L)).thenReturn(new Team(202L, "Team B", "TB", null));

		assertThat(cache.logoUrl(202L)).isEmpty();
		assertThat(cache.logoUrl(202L)).isEmpty();
		verify(openDotaClient, times(1)).fetchTeam(202L);

		clock.advance(Duration.ofMinutes(16));
		when(openDotaClient.fetchTeam(202L))
				.thenReturn(new Team(202L, "Team B", "TB", "https://cdn.example.com/b.png"));

		assertThat(cache.logoUrl(202L)).isEqualTo("https://cdn.example.com/b.png");
	}

	@Test
	void fallsBackWhenOpenDotaFails() {
		when(openDotaClient.fetchTeam(303L)).thenThrow(new OpenDotaException("fallo"));

		assertThat(cache.logoUrl(303L)).isEmpty();
		assertThat(cache.logoUrl(0L)).isEmpty();
	}

	private static final class MutableClock extends Clock {

		private Instant instant;

		private MutableClock(Instant instant) {
			this.instant = instant;
		}

		private void advance(Duration duration) {
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
