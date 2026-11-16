package com.betpulse.shared.ratelimit;

import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Ventana fija en memoria. Suficiente para una instancia local: no comparte
 * estado entre nodos y se reinicia con el backend.
 */
@Component
public class RateLimiter {

	public record Decision(boolean allowed, long retryAfterSeconds) {
	}

	private record Window(long startMillis, int count, long windowMillis) {
	}

	private static final int MAX_TRACKED_KEYS = 10_000;

	private final ConcurrentHashMap<String, Window> windows = new ConcurrentHashMap<>();

	public Decision check(String key, int limit, Duration window) {
		return check(key, limit, window, System.currentTimeMillis());
	}

	Decision check(String key, int limit, Duration window, long nowMillis) {
		long windowMillis = Math.max(1, window.toMillis());
		Window updated = windows.compute(key, (ignored, current) -> {
			if (current == null || nowMillis - current.startMillis() >= windowMillis) {
				return new Window(nowMillis, 1, windowMillis);
			}
			return new Window(current.startMillis, current.count + 1, windowMillis);
		});
		sweepExpired(nowMillis);

		long elapsed = Math.max(0, nowMillis - updated.startMillis());
		long retryAfterSeconds = Math.max(1, (windowMillis - elapsed + 999) / 1000);
		return new Decision(updated.count() <= limit, retryAfterSeconds);
	}

	public void clear() {
		windows.clear();
	}

	private void sweepExpired(long nowMillis) {
		if (windows.size() <= MAX_TRACKED_KEYS) {
			return;
		}
		windows.entrySet().removeIf(entry ->
				nowMillis - entry.getValue().startMillis() >= entry.getValue().windowMillis());
	}

}
