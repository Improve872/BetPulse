package com.betpulse.live;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.betpulse.catalog.CatalogService;
import com.betpulse.catalog.LobbyDtos.FeedHealth;

@RestController
@RequestMapping("/api/live")
public class LiveFeedController {

	private final CatalogService catalogService;
	private final LiveFeedService liveFeedService;

	public LiveFeedController(CatalogService catalogService, LiveFeedService liveFeedService) {
		this.catalogService = catalogService;
		this.liveFeedService = liveFeedService;
	}

	@GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public SseEmitter stream() {
		return liveFeedService.subscribe(catalogService.getLobby());
	}

	@GetMapping("/health")
	public FeedHealth health() {
		return catalogService.getLobby().feed();
	}

}
