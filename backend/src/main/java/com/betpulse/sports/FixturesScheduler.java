package com.betpulse.sports;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "betpulse.espn", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class FixturesScheduler {

	private final FixturesService fixturesService;

	public FixturesScheduler(FixturesService fixturesService) {
		this.fixturesService = fixturesService;
	}

	@Scheduled(initialDelay = 3000, fixedDelay = 30000)
	public void refresh() {
		fixturesService.refreshIfDue();
	}

}
