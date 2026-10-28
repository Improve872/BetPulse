package com.betpulse.catalog;

import java.time.Clock;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.web.client.RestClient;

@Configuration
@EnableScheduling
public class CatalogConfig {

	@Bean
	public RestClient openDotaRestClient(OpenDotaProperties properties) {
		int timeoutMillis = (int) properties.getRequestTimeout().toMillis();
		SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
		requestFactory.setConnectTimeout(timeoutMillis);
		requestFactory.setReadTimeout(timeoutMillis);

		return RestClient.builder()
				.baseUrl(stripTrailingSlash(properties.getBaseUrl()))
				.requestFactory(requestFactory)
				.defaultHeader("Accept", "application/json")
				.build();
	}

	@Bean
	public Clock clock() {
		return Clock.systemUTC();
	}

	private static String stripTrailingSlash(String value) {
		if (value == null || value.isBlank()) {
			return "https://api.opendota.com/api";
		}
		return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
	}

}
