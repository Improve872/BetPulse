package com.betpulse.betting;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "betpulse.betting")
public class BettingProperties {

	private long minStakeCents = 100;
	private long maxStakeCents = 100_000;
	private long maxPayoutCents = 1_000_000;

	public long getMinStakeCents() {
		return minStakeCents;
	}

	public void setMinStakeCents(long minStakeCents) {
		this.minStakeCents = minStakeCents;
	}

	public long getMaxStakeCents() {
		return maxStakeCents;
	}

	public void setMaxStakeCents(long maxStakeCents) {
		this.maxStakeCents = maxStakeCents;
	}

	public long getMaxPayoutCents() {
		return maxPayoutCents;
	}

	public void setMaxPayoutCents(long maxPayoutCents) {
		this.maxPayoutCents = maxPayoutCents;
	}

}
