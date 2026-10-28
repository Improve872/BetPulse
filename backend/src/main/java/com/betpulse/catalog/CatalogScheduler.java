package com.betpulse.catalog;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "betpulse.opendota", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class CatalogScheduler {

	private final CatalogService catalogService;

	public CatalogScheduler(CatalogService catalogService) {
		this.catalogService = catalogService;
	}

	@Scheduled(initialDelay = 1000, fixedDelay = 5000)
	public void refresh() {
		catalogService.refreshIfDue();
	}

}
