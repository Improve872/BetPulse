package com.betpulse.catalog;

import java.net.URI;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.util.UriBuilder;

import com.betpulse.catalog.OpenDotaDtos.LiveMatch;
import com.betpulse.catalog.OpenDotaDtos.ProMatch;

@Component
public class OpenDotaClient {

	private static final Logger log = LoggerFactory.getLogger(OpenDotaClient.class);
	private static final ParameterizedTypeReference<List<LiveMatch>> LIVE_TYPE = new ParameterizedTypeReference<>() {
	};
	private static final ParameterizedTypeReference<List<ProMatch>> PRO_TYPE = new ParameterizedTypeReference<>() {
	};

	private final RestClient restClient;
	private final String apiKey;

	public OpenDotaClient(RestClient openDotaRestClient, OpenDotaProperties properties) {
		this.restClient = openDotaRestClient;
		this.apiKey = properties.getApiKey();
	}

	public List<LiveMatch> fetchLiveMatches() {
		return get("/live", LIVE_TYPE);
	}

	public List<ProMatch> fetchProMatches() {
		return get("/proMatches", PRO_TYPE);
	}

	private <T> T get(String path, ParameterizedTypeReference<T> type) {
		try {
			T body = restClient.get()
					.uri(uriBuilder -> buildUri(uriBuilder, path))
					.retrieve()
					.body(type);
			if (body == null) {
				throw new OpenDotaException("OpenDota devolvió una respuesta vacía para " + path + ".");
			}
			return body;
		} catch (RestClientResponseException exception) {
			log.warn("OpenDota {} returned HTTP {}", path, exception.getStatusCode().value());
			throw new OpenDotaException(
					"OpenDota " + path + " respondió HTTP " + exception.getStatusCode().value() + ".", exception);
		} catch (RestClientException exception) {
			log.warn("OpenDota {} request failed: {}", path, exception.getMessage());
			throw new OpenDotaException("No se pudo consultar OpenDota " + path + ".", exception);
		}
	}

	private URI buildUri(UriBuilder uriBuilder, String path) {
		uriBuilder.path(path);
		Optional.ofNullable(apiKey)
				.map(String::trim)
				.filter(key -> !key.isEmpty())
				.ifPresent(key -> uriBuilder.queryParam("api_key", key));
		return uriBuilder.build();
	}

}
