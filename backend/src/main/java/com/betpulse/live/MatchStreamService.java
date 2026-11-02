package com.betpulse.live;

import java.io.IOException;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.betpulse.live.MatchDetailDtos.MatchDetail;

import jakarta.annotation.PreDestroy;

@Service
public class MatchStreamService {

	private static final Logger log = LoggerFactory.getLogger(MatchStreamService.class);
	private static final long EMITTER_TIMEOUT_MILLIS = 30 * 60 * 1000L;

	private final Map<String, CopyOnWriteArrayList<SseEmitter>> emitters = new ConcurrentHashMap<>();
	private final MatchDetailService matchDetailService;

	public MatchStreamService(MatchDetailService matchDetailService) {
		this.matchDetailService = matchDetailService;
	}

	public SseEmitter subscribe(String matchId, MatchDetail initial) {
		SseEmitter emitter = new SseEmitter(EMITTER_TIMEOUT_MILLIS);
		emitters.computeIfAbsent(matchId, ignored -> new CopyOnWriteArrayList<>()).add(emitter);
		emitter.onCompletion(() -> remove(matchId, emitter));
		emitter.onTimeout(() -> {
			remove(matchId, emitter);
			emitter.complete();
		});
		emitter.onError(error -> remove(matchId, emitter));
		send(emitter, "match", initial);
		return emitter;
	}

	public void publish(String matchId) {
		matchDetailService.find(matchId).ifPresent(detail -> broadcast(matchId, detail));
	}

	@Scheduled(fixedDelay = 15000)
	public void heartbeat() {
		emitters.forEach((matchId, list) -> {
			for (SseEmitter emitter : list) {
				send(emitter, "heartbeat", Map.of("at", Instant.now().toString()));
			}
		});
	}

	public int activeConnections() {
		return emitters.values().stream().mapToInt(CopyOnWriteArrayList::size).sum();
	}

	@PreDestroy
	public void shutdown() {
		emitters.values().forEach(list -> list.forEach(SseEmitter::complete));
		emitters.clear();
	}

	private void broadcast(String matchId, MatchDetail detail) {
		CopyOnWriteArrayList<SseEmitter> list = emitters.get(matchId);
		if (list == null) {
			return;
		}
		for (SseEmitter emitter : list) {
			send(emitter, "match", detail);
		}
	}

	private void remove(String matchId, SseEmitter emitter) {
		CopyOnWriteArrayList<SseEmitter> list = emitters.get(matchId);
		if (list != null) {
			list.remove(emitter);
			if (list.isEmpty()) {
				emitters.remove(matchId);
			}
		}
	}

	private void send(SseEmitter emitter, String name, Object payload) {
		try {
			emitter.send(SseEmitter.event()
					.name(name)
					.data(payload, MediaType.APPLICATION_JSON));
		} catch (IOException | IllegalStateException exception) {
			emitter.complete();
			log.debug("Removed match SSE emitter after send failure: {}", exception.getMessage());
		}
	}

}
