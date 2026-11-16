package com.betpulse.sports;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.betpulse.sports.SportsDtos.FixturesResponse;
import com.betpulse.sports.SportsDtos.LeagueFixtures;

@Service
public class FixturesService {

	private static final Logger log = LoggerFactory.getLogger(FixturesService.class);

	private final EspnScoreboardClient client;
	private final EspnFixtureMapper mapper;
	private final EspnProperties properties;
	private final Clock clock;

	private final Map<String, LeagueFixtures> lastGood = new LinkedHashMap<>();
	private Instant lastAttemptAt;
	private Instant lastSuccessAt;
	private String lastError;

	public FixturesService(EspnScoreboardClient client, EspnFixtureMapper mapper, EspnProperties properties,
			Clock clock) {
		this.client = client;
		this.mapper = mapper;
		this.properties = properties;
		this.clock = clock;
	}

	public FixturesResponse getFixtures() {
		Instant now = clock.instant();
		synchronized (this) {
			return new FixturesResponse(
					"SOCCER",
					now,
					status(now),
					lastSuccessAt,
					lastError,
					List.copyOf(lastGood.values()));
		}
	}

	public void refreshIfDue() {
		Instant now = clock.instant();
		synchronized (this) {
			if (lastAttemptAt != null && now.isBefore(lastAttemptAt.plus(properties.getPollInterval()))) {
				return;
			}
			refresh(now);
		}
	}

	public synchronized void refresh() {
		refresh(clock.instant());
	}

	private void refresh(Instant now) {
		lastAttemptAt = now;
		int successes = 0;
		String error = null;

		for (EspnProperties.League league : properties.getLeagues()) {
			try {
				var fixtures = mapper.map(league, client.fetch(league.getSlug()), now, properties.getHorizonDays());
				lastGood.put(league.getSlug(), new LeagueFixtures(league.getSlug(), league.getName(), fixtures));
				successes++;
			} catch (RuntimeException exception) {
				error = exception.getMessage();
				log.warn("No se pudieron refrescar los fixtures de {}: {}", league.getSlug(), exception.getMessage());
			}
		}

		if (successes > 0) {
			lastSuccessAt = now;
		}
		lastError = successes == properties.getLeagues().size() ? null : error;
	}

	private String status(Instant now) {
		if (lastSuccessAt == null) {
			return "DOWN";
		}
		Duration age = Duration.between(lastSuccessAt, now);
		return age.compareTo(properties.getStaleAfter()) > 0 ? "STALE" : "LIVE";
	}

	/** Solo para tests: deja el servicio como recién arrancado. */
	synchronized void reset() {
		lastGood.clear();
		lastAttemptAt = null;
		lastSuccessAt = null;
		lastError = null;
	}

}
