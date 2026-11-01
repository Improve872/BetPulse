package com.betpulse.markets;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "betpulse.markets", name = "resolution-scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class MarketResultScheduler {

	private static final Logger log = LoggerFactory.getLogger(MarketResultScheduler.class);

	private final MarketResultService marketResultService;

	public MarketResultScheduler(MarketResultService marketResultService) {
		this.marketResultService = marketResultService;
	}

	@Scheduled(initialDelay = 30000, fixedDelay = 30000)
	public void run() {
		try {
			marketResultService.runOnce();
		} catch (RuntimeException exception) {
			log.error("Falló la resolución de resultados por mercado", exception);
		}
	}

}
