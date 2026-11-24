package com.betpulse.sports;

import java.net.URI;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.betpulse.sports.EspnStandingsDtos.Standings;

@Component
public class EspnStandingsClient {

	private static final Logger log = LoggerFactory.getLogger(EspnStandingsClient.class);

	private final RestClient restClient;
	private final EspnProperties properties;

	public EspnStandingsClient(@Qualifier("espnRestClient") RestClient restClient, EspnProperties properties) {
		this.restClient = restClient;
		this.properties = properties;
	}

	public Standings fetch(String leagueSlug) {
		String base = properties.getStandingsBaseUrl();
		String url = stripTrailingSlash(base) + "/soccer/" + leagueSlug + "/standings";
		try {
			Standings body = restClient.get().uri(URI.create(url)).retrieve().body(Standings.class);
			if (body == null) {
				throw new EspnScoreboardClient.SportsFeedException(
						"ESPN devolvió una tabla vacía para " + leagueSlug + ".");
			}
			return body;
		} catch (RestClientResponseException exception) {
			log.warn("ESPN standings {} returned HTTP {}", leagueSlug, exception.getStatusCode().value());
			throw new EspnScoreboardClient.SportsFeedException(
					"ESPN standings " + leagueSlug + " respondió HTTP " + exception.getStatusCode().value() + ".",
					exception);
		} catch (RestClientException exception) {
			log.warn("ESPN standings {} request failed: {}", leagueSlug, exception.getMessage());
			throw new EspnScoreboardClient.SportsFeedException(
					"No se pudo consultar la tabla de ESPN para " + leagueSlug + ".", exception);
		}
	}

	private static String stripTrailingSlash(String value) {
		if (value == null || value.isBlank()) {
			return "https://site.api.espn.com/apis/v2/sports";
		}
		return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
	}

}
