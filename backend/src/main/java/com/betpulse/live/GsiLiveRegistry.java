package com.betpulse.live;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

import com.betpulse.live.IngestDtos.Batch;

/**
 * Último snapshot GSI por partida. La frescura se mide por recepción en el
 * backend, no por el reloj del colector.
 */
@Component
public class GsiLiveRegistry {

	private static final Duration TTL = Duration.ofMinutes(2);
	private static final String POST_GAME = "DOTA_GAMERULES_STATE_POST_GAME";

	private final Clock clock;
	private final Map<String, Entry> latest = new ConcurrentHashMap<>();

	public GsiLiveRegistry(Clock clock) {
		this.clock = clock;
	}

	public void update(Batch batch) {
		if (batch == null || batch.matchId() == null) {
			return;
		}
		latest.put(batch.matchId(), new Entry(batch, clock.instant()));
	}

	public List<Entry> live() {
		Instant cutoff = clock.instant().minus(TTL);
		return latest.values().stream()
				.filter(entry -> entry.receivedAt().isAfter(cutoff))
				.filter(entry -> !isFinished(entry.batch()))
				.toList();
	}

	public Optional<Entry> find(String matchId) {
		Entry entry = latest.get(matchId);
		if (entry == null || entry.receivedAt().isBefore(clock.instant().minus(TTL))
				|| isFinished(entry.batch())) {
			return Optional.empty();
		}
		return Optional.of(entry);
	}

	private static boolean isFinished(Batch batch) {
		return batch != null && POST_GAME.equals(batch.gameState());
	}

	public void remove(String matchId) {
		latest.remove(matchId);
	}

	public record Entry(Batch batch, Instant receivedAt) {
	}

}
