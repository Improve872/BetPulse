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
 * Orquesta calendario, mercados pre-partida y resultados de NBA. El calendario
 * se refresca con {@link BasketballFixturesService}; aquí se publican cuotas y
 * se consultan resultados con sus propios intervalos.
 */
@Component
@ConditionalOnProperty(prefix = "betpulse.basketball", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class BasketballScheduler {

	private static final Logger log = LoggerFactory.getLogger(BasketballScheduler.class);
	private static final Duration MARKET_INTERVAL = Duration.ofMinutes(5);
	private static final Duration RESULT_INTERVAL = Duration.ofMinutes(2);

	private final BasketballFixturesService fixturesService;
	private final BasketballMarketService marketService;
	private final PrematchResultService resultService;
	private final BasketballProperties properties;
	private final Clock clock;

	private Instant lastMarketSync;
	private Instant lastResultPoll;

	public BasketballScheduler(BasketballFixturesService fixturesService, BasketballMarketService marketService,
			PrematchResultService resultService, BasketballProperties properties, Clock clock) {
		this.fixturesService = fixturesService;
		this.marketService = marketService;
		this.resultService = resultService;
		this.properties = properties;
		this.clock = clock;
	}

	@Scheduled(initialDelay = 25000, fixedDelay = 30000)
	public void run() {
		Instant now = clock.instant();
		try {
			fixturesService.refreshIfDue();
			if (lastMarketSync == null || now.isAfter(lastMarketSync.plus(MARKET_INTERVAL))) {
				marketService.sync(fixturesService.getFixtures());
				lastMarketSync = now;
			}
		} catch (RuntimeException exception) {
			log.error("Falló la publicación de mercados de NBA", exception);
		}
		try {
			if (lastResultPoll == null || now.isAfter(lastResultPoll.plus(RESULT_INTERVAL))) {
				resultService.pollOnce("BASKETBALL", "basketball", properties.getResultVoidAfter());
				lastResultPoll = now;
			}
		} catch (RuntimeException exception) {
			log.error("Falló la consulta de resultados de NBA", exception);
		}
	}

}
