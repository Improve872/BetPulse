package com.betpulse.sports;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Orquesta mercados pre-partida y resultados de fútbol. Los fixtures ya se
 * refrescan con {@link FixturesScheduler}; aquí se publican cuotas y se
 * consultan resultados finales con sus propios intervalos.
 */
@Component
@ConditionalOnProperty(prefix = "betpulse.football", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class FootballScheduler {

	private static final Logger log = LoggerFactory.getLogger(FootballScheduler.class);
	private static final Duration MARKET_INTERVAL = Duration.ofMinutes(5);
	private static final Duration RESULT_INTERVAL = Duration.ofMinutes(2);

	private final FixturesService fixturesService;
	private final FootballMarketService marketService;
	private final PrematchResultService resultService;
	private final FootballProperties properties;
	private final Clock clock;

	private Instant lastMarketSync;
	private Instant lastResultPoll;

	public FootballScheduler(FixturesService fixturesService, FootballMarketService marketService,
			PrematchResultService resultService, FootballProperties properties, Clock clock) {
		this.fixturesService = fixturesService;
		this.marketService = marketService;
		this.resultService = resultService;
		this.properties = properties;
		this.clock = clock;
	}

	@Scheduled(initialDelay = 20000, fixedDelay = 30000)
	public void run() {
		Instant now = clock.instant();
		try {
			fixturesService.refreshIfDue();
			if (lastMarketSync == null || now.isAfter(lastMarketSync.plus(MARKET_INTERVAL))) {
				marketService.sync(fixturesService.getFixtures());
				lastMarketSync = now;
			}
		} catch (RuntimeException exception) {
			log.error("Falló la publicación de mercados de fútbol", exception);
		}
		try {
			if (lastResultPoll == null || now.isAfter(lastResultPoll.plus(RESULT_INTERVAL))) {
				resultService.pollOnce("SOCCER", "soccer", properties.getResultVoidAfter());
				lastResultPoll = now;
			}
		} catch (RuntimeException exception) {
			log.error("Falló la consulta de resultados de fútbol", exception);
		}
	}

}
