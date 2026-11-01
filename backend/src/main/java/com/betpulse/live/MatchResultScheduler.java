package com.betpulse.live;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "betpulse.opendota", name = "result-scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class MatchResultScheduler {

	private static final Logger log = LoggerFactory.getLogger(MatchResultScheduler.class);

	private final MatchResultService matchResultService;

	public MatchResultScheduler(MatchResultService matchResultService) {
		this.matchResultService = matchResultService;
	}

	@Scheduled(initialDelay = 20000, fixedDelay = 30000)
	public void run() {
		try {
			matchResultService.runOnce();
		} catch (RuntimeException exception) {
			log.error("Falló la resolución de resultados de partidas", exception);
		}
	}

}
