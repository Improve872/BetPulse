package com.betpulse.sports;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;

import com.betpulse.sports.EspnScoreboardDtos.Scoreboard;

@Component
public class EspnScoreboardClient {

	private static final Logger log = LoggerFactory.getLogger(EspnScoreboardClient.class);

	private final RestClient restClient;

	public EspnScoreboardClient(@Qualifier("espnRestClient") RestClient restClient) {
		this.restClient = restClient;
	}

	public Scoreboard fetch(String leagueSlug) {
		String path = "/soccer/" + leagueSlug + "/scoreboard";
		try {
			Scoreboard body = restClient.get().uri(path).retrieve().body(Scoreboard.class);
			if (body == null) {
				throw new SportsFeedException("ESPN devolvió una respuesta vacía para " + leagueSlug + ".");
			}
			return body;
		} catch (RestClientResponseException exception) {
			log.warn("ESPN {} returned HTTP {}", leagueSlug, exception.getStatusCode().value());
			throw new SportsFeedException(
					"ESPN " + leagueSlug + " respondió HTTP " + exception.getStatusCode().value() + ".", exception);
		} catch (RestClientException exception) {
			log.warn("ESPN {} request failed: {}", leagueSlug, exception.getMessage());
			throw new SportsFeedException("No se pudo consultar ESPN para " + leagueSlug + ".", exception);
		}
	}

	public static class SportsFeedException extends RuntimeException {

		public SportsFeedException(String message) {
			super(message);
		}

		public SportsFeedException(String message, Throwable cause) {
			super(message, cause);
		}

	}

}
