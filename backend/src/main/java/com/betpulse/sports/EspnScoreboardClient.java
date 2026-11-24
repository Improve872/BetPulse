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
		return get("/soccer/" + leagueSlug + "/scoreboard", leagueSlug);
	}

	public Scoreboard fetch(String leagueSlug, java.time.LocalDate date) {
		String day = java.time.format.DateTimeFormatter.BASIC_ISO_DATE.format(date);
		return get("/soccer/" + leagueSlug + "/scoreboard?dates=" + day, leagueSlug);
	}

	/** Un mes completo en una sola petición: ESPN acepta `dates=YYYYMM`. */
	public Scoreboard fetch(String leagueSlug, java.time.YearMonth month) {
		String key = java.time.format.DateTimeFormatter.ofPattern("yyyyMM").format(month);
		return get("/soccer/" + leagueSlug + "/scoreboard?dates=" + key, leagueSlug);
	}

	private Scoreboard get(String path, String leagueSlug) {
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
