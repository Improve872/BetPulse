package com.betpulse.live;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.betpulse.catalog.CatalogUpdatedEvent;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.markets.MarketService;
import com.betpulse.markets.MarketsUpdatedEvent;

import jakarta.annotation.PreDestroy;

@Service
public class LiveFeedService {

	private static final Logger log = LoggerFactory.getLogger(LiveFeedService.class);
	private static final long EMITTER_TIMEOUT_MILLIS = 30 * 60 * 1000L;

	private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();
	private final MarketService marketService;

	public LiveFeedService(MarketService marketService) {
		this.marketService = marketService;
	}

	public SseEmitter subscribe(LobbyResponse initial) {
		SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MILLIS);
		emitters.add(emitter);
		emitter.onCompletion(() -> emitters.remove(emitter));
		emitter.onTimeout(() -> {
			emitters.remove(emitter);
			emitter.complete();
		});
		emitter.onError(error -> emitters.remove(emitter));

		send(emitter, "lobby", initial);
		send(emitter, "markets", marketService.getLiveMarkets());
		return emitter;
	}

	@EventListener
	public void onCatalogUpdated(CatalogUpdatedEvent event) {
		broadcast("lobby", event.response());
	}

	@EventListener
	public void onMarketsUpdated(MarketsUpdatedEvent event) {
		broadcast("markets", event.response());
	}

	@Scheduled(fixedDelay = 15000)
	public void heartbeat() {
		broadcast("heartbeat", Map.of("at", Instant.now().toString()));
	}

	public int activeConnections() {
		return emitters.size();
	}

	@PreDestroy
	public void shutdown() {
		emitters.forEach(SseEmitter::complete);
		emitters.clear();
	}

	private void broadcast(String name, Object payload) {
		for (SseEmitter emitter : emitters) {
			send(emitter, name, payload);
		}
	}

	private void send(SseEmitter emitter, String name, Object payload) {
		try {
			emitter.send(SseEmitter.event()
					.name(name)
					.data(payload, MediaType.APPLICATION_JSON));
		} catch (IOException | IllegalStateException exception) {
			emitters.remove(emitter);
			emitter.complete();
			log.debug("Removed SSE emitter after send failure: {}", exception.getMessage());
		}
	}

}
