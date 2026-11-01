package com.betpulse.collector;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Envía batches firmados al backend. Si el backend no responde, el batch queda
 * en el spool y se reintenta en segundo plano.
 */
public final class IngestForwarder {

	private final URI backendUri;
	private final String secret;
	private final Spool spool;
	private final ObjectMapper objectMapper;
	private final HttpClient httpClient;
	private volatile Instant lastSuccessAt;
	private volatile String lastError;

	public IngestForwarder(URI backendUri, String secret, Spool spool, ObjectMapper objectMapper) {
		this.backendUri = backendUri;
		this.secret = secret;
		this.spool = spool;
		this.objectMapper = objectMapper;
		this.httpClient = HttpClient.newBuilder()
				.connectTimeout(Duration.ofSeconds(3))
				.build();
	}

	public boolean forward(NormalizedBatch batch) {
		try {
			post(objectMapper.writeValueAsString(batch));
			lastSuccessAt = Instant.now();
			lastError = null;
			return true;
		} catch (Exception exception) {
			lastError = exception.getMessage();
			try {
				spool.enqueue(objectMapper.writeValueAsString(batch));
			} catch (Exception spoolFailure) {
				lastError = "spool: " + spoolFailure.getMessage();
			}
			return false;
		}
	}

	public int retryPending() {
		List<String> pending;
		try {
			pending = spool.readAll();
		} catch (IOException exception) {
			lastError = exception.getMessage();
			return -1;
		}
		if (pending.isEmpty()) {
			return 0;
		}
		List<String> failed = new ArrayList<>();
		for (String body : pending) {
			try {
				post(body);
				lastSuccessAt = Instant.now();
			} catch (Exception exception) {
				lastError = exception.getMessage();
				failed.add(body);
			}
		}
		try {
			spool.replaceAll(failed);
		} catch (IOException exception) {
			lastError = "spool: " + exception.getMessage();
		}
		return failed.size();
	}

	private void post(String body) throws IOException, InterruptedException {
		String timestamp = String.valueOf(Instant.now().getEpochSecond());
		String signature = Signature.sign(secret, timestamp + "." + body);
		HttpRequest request = HttpRequest.newBuilder(backendUri.resolve("/internal/ingest"))
				.timeout(Duration.ofSeconds(5))
				.header("Content-Type", "application/json")
				.header("X-BetPulse-Timestamp", timestamp)
				.header("X-BetPulse-Signature", signature)
				.POST(HttpRequest.BodyPublishers.ofString(body, StandardCharsets.UTF_8))
				.build();
		HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
		if (response.statusCode() >= 300) {
			throw new IOException("backend HTTP " + response.statusCode() + ": " + truncate(response.body()));
		}
	}

	public int queueDepth() {
		try {
			return spool.size();
		} catch (IOException exception) {
			return -1;
		}
	}

	public Instant lastSuccessAt() {
		return lastSuccessAt;
	}

	public String lastError() {
		return lastError;
	}

	private static String truncate(String value) {
		if (value == null) {
			return "";
		}
		return value.length() > 200 ? value.substring(0, 200) : value;
	}

}
