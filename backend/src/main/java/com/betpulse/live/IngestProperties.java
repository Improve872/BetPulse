package com.betpulse.live;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "betpulse.ingest")
public class IngestProperties {

	private String secret = "betpulse-dev-ingest-secret";
	private Duration timestampWindow = Duration.ofMinutes(5);

	public String getSecret() {
		return secret;
	}

	public void setSecret(String secret) {
		this.secret = secret;
	}

	public Duration getTimestampWindow() {
		return timestampWindow;
	}

	public void setTimestampWindow(Duration timestampWindow) {
		this.timestampWindow = timestampWindow;
	}

}
