package com.betpulse.catalog;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.betpulse.catalog.OpenDotaDtos.League;

/**
 * Resuelve el nombre de una liga con cache en memoria. OpenDota /live solo
 * entrega league_id; el nombre se consulta una vez por liga y se reutiliza.
 */
@Component
public class LeagueNameCache {

	private static final Logger log = LoggerFactory.getLogger(LeagueNameCache.class);
	private static final Duration TTL = Duration.ofHours(6);
	private static final Duration NEGATIVE_TTL = Duration.ofMinutes(10);

	private final OpenDotaClient openDotaClient;
	private final Clock clock;
	private final Map<Long, Entry> cache = new ConcurrentHashMap<>();

	public LeagueNameCache(OpenDotaClient openDotaClient, Clock clock) {
		this.openDotaClient = openDotaClient;
		this.clock = clock;
	}

	public String name(long leagueId) {
		if (leagueId <= 0) {
			return "";
		}
		Instant now = clock.instant();
		Entry cached = cache.get(leagueId);
		if (cached != null && now.isBefore(cached.expiresAt())) {
			return cached.name();
		}

		try {
			League league = openDotaClient.fetchLeague(leagueId);
			String name = league != null && league.name() != null ? league.name().trim() : "";
			Duration ttl = name.isEmpty() ? NEGATIVE_TTL : TTL;
			cache.put(leagueId, new Entry(name, now.plus(ttl)));
			return name;
		} catch (RuntimeException exception) {
			log.debug("No se pudo resolver la liga {}: {}", leagueId, exception.getMessage());
			cache.put(leagueId, new Entry("", now.plus(NEGATIVE_TTL)));
			return "";
		}
	}

	public void evictAll() {
		cache.clear();
	}

	private record Entry(String name, Instant expiresAt) {
	}

}
