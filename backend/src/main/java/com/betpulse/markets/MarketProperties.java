package com.betpulse.markets;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "betpulse.markets")
public class MarketProperties {

	private Duration closeGrace = Duration.ofSeconds(120);
	private boolean resolutionSchedulerEnabled = true;

	public Duration getCloseGrace() {
		return closeGrace;
	}

	public void setCloseGrace(Duration closeGrace) {
		this.closeGrace = closeGrace;
	}

	public boolean isResolutionSchedulerEnabled() {
		return resolutionSchedulerEnabled;
	}

	public void setResolutionSchedulerEnabled(boolean resolutionSchedulerEnabled) {
		this.resolutionSchedulerEnabled = resolutionSchedulerEnabled;
	}

}
