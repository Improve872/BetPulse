package com.betpulse.settlement;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(prefix = "betpulse.settlement", name = "scheduler-enabled", havingValue = "true", matchIfMissing = true)
public class SettlementScheduler {

	private static final Logger log = LoggerFactory.getLogger(SettlementScheduler.class);

	private final SettlementService settlementService;

	public SettlementScheduler(SettlementService settlementService) {
		this.settlementService = settlementService;
	}

	@Scheduled(initialDelay = 10000, fixedDelay = 5000)
	public void run() {
		try {
			int settled = settlementService.settlePending();
			if (settled > 0) {
				log.info("Apuestas liquidadas: {}", settled);
			}
		} catch (RuntimeException exception) {
			log.error("Falló la liquidación de apuestas", exception);
		}
	}

}
