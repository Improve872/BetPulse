package com.betpulse.catalog;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.request;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.LobbyDtos.LobbyTeam;
import com.betpulse.live.LiveFeedController;
import com.betpulse.live.LiveFeedService;

@WebMvcTest(controllers = { CatalogController.class, LiveFeedController.class })
@AutoConfigureMockMvc(addFilters = false)
class CatalogControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private CatalogService catalogService;

	@MockitoBean
	private LiveFeedService liveFeedService;

	@Test
	void returnsLobbySnapshot() throws Exception {
		when(catalogService.getLobby()).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/catalog/lobby"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.live[0].id").value("123"))
				.andExpect(jsonPath("$.live[0].radiant.score").value(12))
				.andExpect(jsonPath("$.recent").isEmpty())
				.andExpect(jsonPath("$.feed.status").value("LIVE"))
				.andExpect(jsonPath("$.feed.source").value("OPENDOTA"));
	}

	@Test
	void returnsFeedHealth() throws Exception {
		when(catalogService.getLobby()).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/live/health"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.status").value("LIVE"))
				.andExpect(jsonPath("$.stale").value(false));
	}

	@Test
	void startsSseStream() throws Exception {
		SseEmitter emitter = new SseEmitter(1_000L);
		when(catalogService.getLobby()).thenReturn(sampleResponse());
		when(liveFeedService.subscribe(any())).thenReturn(emitter);

		MvcResult result = mockMvc.perform(get("/api/live/stream"))
				.andExpect(status().isOk())
				.andExpect(request().asyncStarted())
				.andReturn();

		emitter.complete();
		org.assertj.core.api.Assertions.assertThat(result.getResponse().getContentType())
				.startsWith(MediaType.TEXT_EVENT_STREAM_VALUE);
	}

	private static LobbyResponse sampleResponse() {
		Instant now = Instant.parse("2026-10-26T12:00:00Z");
		LobbyMatch match = new LobbyMatch("123", "dota2", "live", "", "pro", "", now.getEpochSecond(), 600,
				new LobbyTeam("Team A", 12, "radiant", null),
				new LobbyTeam("Team B", 8, "dire", null),
				5_000, 1_000, 120);
		return new LobbyResponse(List.of(match), List.of(), now,
				new FeedHealth("OPENDOTA", "LIVE", now, now, now.plusSeconds(30), 0, null, false));
	}

}
