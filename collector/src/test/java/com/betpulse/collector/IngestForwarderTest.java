package com.betpulse.collector;

import static org.assertj.core.api.Assertions.assertThat;

import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

class IngestForwarderTest {

	private final ObjectMapper objectMapper = new ObjectMapper();
	private HttpServer server;

	@AfterEach
	void stopServer() {
		if (server != null) {
			server.stop(0);
		}
	}

	@Test
	void forwardsSignedBatchToBackend(@TempDir Path directory) throws Exception {
		AtomicReference<String> bodyRef = new AtomicReference<>();
		AtomicReference<String> timestampRef = new AtomicReference<>();
		AtomicReference<String> signatureRef = new AtomicReference<>();
		server = fakeBackend(bodyRef, timestampRef, signatureRef);

		IngestForwarder forwarder = new IngestForwarder(uri(server), "secret", new Spool(directory), objectMapper);

		assertThat(forwarder.forward(batch())).isTrue();
		assertThat(bodyRef.get()).contains("\"matchId\":\"9072345549\"");
		assertThat(Signature.matches("secret", timestampRef.get() + "." + bodyRef.get(), signatureRef.get()))
				.isTrue();
		assertThat(forwarder.lastSuccessAt()).isNotNull();
		assertThat(forwarder.lastError()).isNull();
	}

	@Test
	void spoolsWhenBackendIsDownAndRetriesLater(@TempDir Path directory) throws Exception {
		int closedPort;
		try (ServerSocket socket = new ServerSocket(0)) {
			closedPort = socket.getLocalPort();
		}
		Spool spool = new Spool(directory.resolve("failed"));
		IngestForwarder down = new IngestForwarder(URI.create("http://127.0.0.1:" + closedPort), "secret", spool,
				objectMapper);

		assertThat(down.forward(batch())).isFalse();
		assertThat(spool.size()).isEqualTo(1);

		AtomicReference<String> bodyRef = new AtomicReference<>();
		server = fakeBackend(bodyRef, new AtomicReference<>(), new AtomicReference<>());
		IngestForwarder healthy = new IngestForwarder(uri(server), "secret", spool, objectMapper);

		assertThat(healthy.retryPending()).isZero();
		assertThat(spool.size()).isZero();
		assertThat(bodyRef.get()).contains("\"matchId\":\"9072345549\"");
	}

	private HttpServer fakeBackend(AtomicReference<String> bodyRef, AtomicReference<String> timestampRef,
			AtomicReference<String> signatureRef) throws Exception {
		HttpServer httpServer = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		httpServer.createContext("/internal/ingest", exchange -> {
			bodyRef.set(new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8));
			timestampRef.set(exchange.getRequestHeaders().getFirst("X-BetPulse-Timestamp"));
			signatureRef.set(exchange.getRequestHeaders().getFirst("X-BetPulse-Signature"));
			exchange.sendResponseHeaders(202, 0);
			exchange.close();
		});
		httpServer.start();
		return httpServer;
	}

	private static URI uri(HttpServer httpServer) {
		return URI.create("http://127.0.0.1:" + httpServer.getAddress().getPort());
	}

	private static NormalizedBatch batch() {
		return new NormalizedBatch(1, UUID.randomUUID(), UUID.randomUUID(), "9072345549",
				Instant.parse("2026-11-01T18:00:00Z").toString(), 76, 309,
				"DOTA_GAMERULES_STATE_GAME_IN_PROGRESS", false, 1, 0, "none", null, null,
				List.of(), List.of(), null, List.of());
	}

}
