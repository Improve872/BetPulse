package com.betpulse.markets;

import java.math.BigDecimal;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "betpulse.odds")
public class OddsProperties {

	private BigDecimal margin = new BigDecimal("0.06");
	private double killWeight = 0.20;
	private int referenceGameSeconds = 2400;
	private double minProbability = 0.08;
	private double maxProbability = 0.92;

	public BigDecimal getMargin() {
		return margin;
	}

	public void setMargin(BigDecimal margin) {
		this.margin = margin;
	}

	public double getKillWeight() {
		return killWeight;
	}

	public void setKillWeight(double killWeight) {
		this.killWeight = killWeight;
	}

	public int getReferenceGameSeconds() {
		return referenceGameSeconds;
	}

	public void setReferenceGameSeconds(int referenceGameSeconds) {
		this.referenceGameSeconds = referenceGameSeconds;
	}

	public double getMinProbability() {
		return minProbability;
	}

	public void setMinProbability(double minProbability) {
		this.minProbability = minProbability;
	}

	public double getMaxProbability() {
		return maxProbability;
	}

	public void setMaxProbability(double maxProbability) {
		this.maxProbability = maxProbability;
	}

}
