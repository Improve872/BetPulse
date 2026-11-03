package com.betpulse.catalog;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import com.betpulse.catalog.OpenDotaDtos.Team;

/**
 * Resuelve la URL del escudo de un equipo con cache en memoria. OpenDota /live
 * y /proMatches solo entregan team_id; la URL se consulta una vez por equipo y
 * se reutiliza para no bloquear el refresco del catálogo.
 */
@Component
public class TeamLogoCache {

	private static final Logger log = LoggerFactory.getLogger(TeamLogoCache.class);
	private static final Duration TTL = Duration.ofHours(12);
	private static final Duration NEGATIVE_TTL = Duration.ofMinutes(15);

	private final OpenDotaClient openDotaClient;
	private final Clock clock;
	private final Map<Long, Entry> cache = new ConcurrentHashMap<>();

	public TeamLogoCache(OpenDotaClient openDotaClient, Clock clock) {
		this.openDotaClient = openDotaClient;
		this.clock = clock;
	}

	public String logoUrl(long teamId) {
		if (teamId <= 0) {
			return "";
		}
		Instant now = clock.instant();
		Entry cached = cache.get(teamId);
		if (cached != null && now.isBefore(cached.expiresAt())) {
			return cached.logoUrl();
		}

		try {
			Team team = openDotaClient.fetchTeam(teamId);
			String logoUrl = team != null && team.logoUrl() != null ? team.logoUrl().trim() : "";
			Duration ttl = logoUrl.isEmpty() ? NEGATIVE_TTL : TTL;
			cache.put(teamId, new Entry(logoUrl, now.plus(ttl)));
			return logoUrl;
		} catch (RuntimeException exception) {
			log.debug("No se pudo resolver el escudo del equipo {}: {}", teamId, exception.getMessage());
			cache.put(teamId, new Entry("", now.plus(NEGATIVE_TTL)));
			return "";
		}
	}

	public void evictAll() {
		cache.clear();
	}

	private record Entry(String logoUrl, Instant expiresAt) {
	}

}
