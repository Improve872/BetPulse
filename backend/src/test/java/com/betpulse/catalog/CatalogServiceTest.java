package com.betpulse.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.OpenDotaDtos.LiveMatch;
import com.betpulse.catalog.OpenDotaDtos.ProMatch;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {

	@Mock
	private OpenDotaClient openDotaClient;

	@Mock
	private ApplicationEventPublisher eventPublisher;

	private MutableClock clock;
	private OpenDotaProperties properties;
	private CatalogService service;

	@BeforeEach
	void setUp() {
		clock = new MutableClock(Instant.parse("2026-10-26T12:00:00Z"));
		properties = new OpenDotaProperties();
		service = new CatalogService(openDotaClient, eventPublisher, properties, clock);
	}

	@Test
	void startsEmptyAndStarting() {
		LobbyResponse response = service.getLobby();

		assertThat(response.live()).isEmpty();
		assertThat(response.recent()).isEmpty();
		assertThat(response.updatedAt()).isEqualTo(clock.instant());
		assertThat(response.feed().status()).isEqualTo("STARTING");
		assertThat(response.feed().stale()).isTrue();
		assertThat(response.feed().consecutiveFailures()).isZero();
	}

	@Test
	void mapsFiltersAndSortsCatalog() {
		List<LiveMatch> live = new ArrayList<>();
		live.add(liveMatch(1, 1, 100, 5_000, true, 600, 0));
		live.add(liveMatch(2, 1, 300, 4_000, true, 500, 0));
		live.add(liveMatch(3, 1, 999, 9_000, false, 500, 0));
		live.add(liveMatch(4, 1, 999, 9_000, true, 500, 1));
		live.add(liveMatch(5, 1, 999, 9_000, true, 0, 0));
		live.add(liveMatch(6, 0, 200, 3_000, true, 400, 0));
		live.add(liveMatch(7, 1, 150, 2_000, true, 300, 0));
		live.add(liveMatch(8, 1, 50, 1_000, true, 200, 0));
		live.add(liveMatch(9, 1, 25, 500, true, 100, 0));

		List<ProMatch> pro = new ArrayList<>();
		for (int index = 0; index < 10; index++) {
			pro.add(proMatch(100 + index, 1_000 + index, "Team " + index, "Rival " + index, index % 2 == 1));
		}
		pro.add(proMatch(999, 9_999, "", "Rival", true));

		when(openDotaClient.fetchLiveMatches()).thenReturn(live);
		when(openDotaClient.fetchProMatches()).thenReturn(pro);

		service.refresh();
		LobbyResponse response = service.getLobby();

		assertThat(response.live()).hasSize(6);
		assertThat(response.live()).extracting(match -> match.id())
				.containsExactly("2", "6", "7", "1", "8", "9");
		assertThat(response.live().getFirst().radiant().name()).isEqualTo("Radiant 2");
		assertThat(response.live().getFirst().dire().score()).isEqualTo(7);
		assertThat(response.live().getFirst().delaySeconds()).isEqualTo(120);
		assertThat(response.live().get(1).tournamentKind()).isEqualTo("ranked");

		assertThat(response.recent()).hasSize(8);
		assertThat(response.recent()).extracting(match -> match.id())
				.containsExactly("109", "108", "107", "106", "105", "104", "103", "102");
		assertThat(response.recent().getFirst().format()).isEqualTo("BO3");
		assertThat(response.recent().getFirst().radiant().winner()).isTrue();
		assertThat(response.recent().getFirst().dire().winner()).isFalse();

		assertThat(response.feed().status()).isEqualTo("LIVE");
		assertThat(response.feed().stale()).isFalse();
		assertThat(response.feed().lastSuccessAt()).isEqualTo(clock.instant());
		verify(eventPublisher, times(1)).publishEvent(any(CatalogUpdatedEvent.class));
	}

	@Test
	void keepsLastSnapshotAndMarksFeedDegradedOnFailure() {
		when(openDotaClient.fetchLiveMatches()).thenReturn(List.of(
				liveMatch(1, 1, 100, 5_000, true, 600, 0)));
		when(openDotaClient.fetchProMatches()).thenReturn(List.of());
		service.refresh();

		clock.advance(Duration.ofSeconds(10));
		when(openDotaClient.fetchLiveMatches()).thenThrow(new OpenDotaException("OpenDota no disponible."));

		service.refresh();
		LobbyResponse response = service.getLobby();

		assertThat(response.live()).hasSize(1);
		assertThat(response.feed().status()).isEqualTo("DEGRADED");
		assertThat(response.feed().consecutiveFailures()).isEqualTo(1);
		assertThat(response.feed().lastError()).contains("OpenDota no disponible");
		assertThat(response.feed().nextAttemptAt())
				.isEqualTo(clock.instant().plus(properties.getBackoffBase()));
		assertThat(response.feed().lastSuccessAt()).isBefore(clock.instant());
		verify(eventPublisher, times(2)).publishEvent(any(CatalogUpdatedEvent.class));
	}

	@Test
	void appliesExponentialBackoffOnRepeatedFailures() {
		when(openDotaClient.fetchLiveMatches()).thenThrow(new OpenDotaException("fallo"));

		service.refresh();
		assertThat(service.getLobby().feed().nextAttemptAt())
				.isEqualTo(clock.instant().plus(Duration.ofSeconds(30)));

		clock.advance(Duration.ofSeconds(30));
		service.refresh();
		assertThat(service.getLobby().feed().consecutiveFailures()).isEqualTo(2);
		assertThat(service.getLobby().feed().nextAttemptAt())
				.isEqualTo(clock.instant().plus(Duration.ofSeconds(60)));
		assertThat(service.getLobby().feed().status()).isEqualTo("DOWN");
	}

	@Test
	void marksFeedStaleWhenLastSuccessIsOld() {
		when(openDotaClient.fetchLiveMatches()).thenReturn(List.of());
		when(openDotaClient.fetchProMatches()).thenReturn(List.of());
		service.refresh();

		clock.advance(Duration.ofMinutes(4));
		LobbyResponse response = service.getLobby();

		assertThat(response.feed().status()).isEqualTo("STALE");
		assertThat(response.feed().stale()).isTrue();
	}

	private static LiveMatch liveMatch(long id, long leagueId, int spectators, int mmr, boolean eligible,
			long gameTime, long deactivateTime) {
		return new LiveMatch(id, leagueId, 1_000L, deactivateTime, gameTime, 120, spectators, mmr,
				(int) id, (int) id + 5, "Radiant " + id, "Dire " + id, eligible);
	}

	private static ProMatch proMatch(long id, long startTime, String radiantName, String direName,
			boolean radiantWin) {
		return new ProMatch(id, 2_400L, startTime, radiantName, direName, "League " + id,
				(int) (id % 3), 20, 15, radiantWin);
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
