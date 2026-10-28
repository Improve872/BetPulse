package com.betpulse.catalog;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "betpulse.opendota")
public class OpenDotaProperties {

	private String baseUrl = "https://api.opendota.com/api";
	private String apiKey = "";
	private Duration requestTimeout = Duration.ofSeconds(7);
	private Duration pollInterval = Duration.ofSeconds(30);
	private Duration backoffBase = Duration.ofSeconds(30);
	private Duration backoffMax = Duration.ofMinutes(5);
	private Duration staleAfter = Duration.ofMinutes(3);

	public String getBaseUrl() {
		return baseUrl;
	}

	public void setBaseUrl(String baseUrl) {
		this.baseUrl = baseUrl;
	}

	public String getApiKey() {
		return apiKey;
	}

	public void setApiKey(String apiKey) {
		this.apiKey = apiKey;
	}

	public Duration getRequestTimeout() {
		return requestTimeout;
	}

	public void setRequestTimeout(Duration requestTimeout) {
		this.requestTimeout = requestTimeout;
	}

	public Duration getPollInterval() {
		return pollInterval;
	}

	public void setPollInterval(Duration pollInterval) {
		this.pollInterval = pollInterval;
	}

	public Duration getBackoffBase() {
		return backoffBase;
	}

	public void setBackoffBase(Duration backoffBase) {
		this.backoffBase = backoffBase;
	}

	public Duration getBackoffMax() {
		return backoffMax;
	}

	public void setBackoffMax(Duration backoffMax) {
		this.backoffMax = backoffMax;
	}

	public Duration getStaleAfter() {
		return staleAfter;
	}

	public void setStaleAfter(Duration staleAfter) {
		this.staleAfter = staleAfter;
	}

}
