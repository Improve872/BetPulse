package com.betpulse.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.betpulse.catalog.OpenDotaClient;
import com.betpulse.catalog.OpenDotaDtos.MatchDetails;
import com.betpulse.catalog.OpenDotaDtos.Objective;
import com.betpulse.catalog.OpenDotaProperties;
import com.betpulse.live.MatchResultStore.PendingResult;
import com.fasterxml.jackson.databind.ObjectMapper;

@ExtendWith(MockitoExtension.class)
class MatchResultServiceTest {

	private static final Instant NOW = Instant.parse("2026-11-01T18:00:00Z");

	@Mock
	private MatchResultStore store;

	@Mock
	private OpenDotaClient openDotaClient;

	private OpenDotaProperties properties;
	private MatchResultService service;

	@BeforeEach
	void setUp() {
		properties = new OpenDotaProperties();
		service = new MatchResultService(store, openDotaClient, new ObjectMapper(), properties, fixedClock());
	}

	@Test
	void resolvesFinishedMatchAndStoresObjectives() {
		when(store.enqueueClosedMatchesWithoutResult()).thenReturn(1);
		when(store.findPending(NOW, 10)).thenReturn(List.of(new PendingResult("9071885340", 0)));
		when(openDotaClient.fetchMatch(9071885340L)).thenReturn(new MatchDetails(
				9071885340L, true, 44, 37, 3078L, 222L, 20395L, 1_793_000_000L, 22, 7,
				List.of(new Objective(222L, "CHAT_MESSAGE_FIRSTBLOOD", null, 9, "0"),
						new Objective(486L, "building_kill", null, 4, "npc_dota_badguys_tower1_top"))));

		service.runOnce();

		ArgumentCaptor<String> objectives = ArgumentCaptor.forClass(String.class);
		verify(store).markReady(eq("9071885340"), any(MatchDetails.class), objectives.capture(), eq(NOW));
		assertThat(objectives.getValue()).contains("CHAT_MESSAGE_FIRSTBLOOD").contains("npc_dota_badguys_tower1_top");
	}

	@Test
	void retriesWhenMatchHasNoFinalResultYet() {
		when(store.findPending(NOW, 10)).thenReturn(List.of(new PendingResult("9071885340", 3)));
		when(openDotaClient.fetchMatch(9071885340L)).thenReturn(new MatchDetails(
				9071885340L, null, null, null, null, null, null, null, null, null, List.of()));

		service.runOnce();

		verify(store).markFailure(eq("9071885340"), anyString(), eq(NOW.plus(Duration.ofSeconds(240))), eq(false),
				eq(NOW));
	}

	@Test
	void marksFailedAfterMaxAttempts() {
		properties.setResultMaxAttempts(5);
		when(store.findPending(NOW, 10)).thenReturn(List.of(new PendingResult("9071885340", 4)));
		when(openDotaClient.fetchMatch(9071885340L)).thenThrow(new RuntimeException("OpenDota no disponible"));

		service.runOnce();

		verify(store).markFailure(eq("9071885340"), anyString(), any(Instant.class), eq(true), eq(NOW));
	}

	@Test
	void rejectsNonNumericMatchIdWithoutCallingOpenDota() {
		when(store.findPending(NOW, 10)).thenReturn(List.of(new PendingResult("local-bot-1", 0)));

		service.runOnce();

		verify(store).markFailure(eq("local-bot-1"), anyString(), any(Instant.class), eq(true), eq(NOW));
		verify(openDotaClient, never()).fetchMatch(anyLong());
	}

	@Test
	void doesNothingWhenNoPendingResults() {
		when(store.findPending(NOW, 10)).thenReturn(List.of());

		service.runOnce();

		verify(store, never()).markReady(anyString(), any(), anyString(), any());
		verify(store, never()).markFailure(anyString(), anyString(), any(), anyBoolean(), any());
	}

	private static Clock fixedClock() {
		return new Clock() {
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
				return NOW;
			}
		};
	}

}
