package com.betpulse.sports;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

@Configuration
public class SportsConfig {

	@Bean
	public RestClient espnRestClient(EspnProperties properties) {
		int timeoutMillis = (int) properties.getRequestTimeout().toMillis();
		SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
		requestFactory.setConnectTimeout(timeoutMillis);
		requestFactory.setReadTimeout(timeoutMillis);

		return RestClient.builder()
				.baseUrl(stripTrailingSlash(properties.getBaseUrl()))
				.requestFactory(requestFactory)
				.defaultHeader("Accept", "application/json")
				// ESPN responde 403 al User-Agent por defecto de Java.
				.defaultHeader("User-Agent", "BetPulse/0.1 (local demo)")
				.build();
	}

	private static String stripTrailingSlash(String value) {
		if (value == null || value.isBlank()) {
			return "https://site.api.espn.com/apis/site/v2/sports";
		}
		return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
	}

}
