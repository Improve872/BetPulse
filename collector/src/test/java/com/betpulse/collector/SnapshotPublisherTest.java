package com.betpulse.collector;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.net.InetSocketAddress;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Path;
import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpServer;

class SnapshotPublisherTest {

	private final ObjectMapper objectMapper = new ObjectMapper();

	@Test
	void throttlesSnapshotsAndDeduplicatesEvents(@TempDir Path directory) throws Exception {
		AtomicInteger requests = new AtomicInteger();
		HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
		server.createContext("/internal/ingest", exchange -> {
			exchange.getRequestBody().readAllBytes();
			requests.incrementAndGet();
			exchange.sendResponseHeaders(202, 0);
			exchange.close();
		});
		server.start();
		try {
			IngestForwarder forwarder = new IngestForwarder(
					URI.create("http://127.0.0.1:" + server.getAddress().getPort()), "secret",
					new Spool(directory), objectMapper);
			SnapshotPublisher publisher = new SnapshotPublisher(new GsiNormalizer(objectMapper), forwarder,
					objectMapper, UUID.randomUUID(), 1000);
			String raw = fixture("spectator-first-blood.json");
			Instant start = Instant.parse("2026-11-01T18:00:00Z");

			assertThat(publisher.accept(raw, start)).isTrue();
			assertThat(requests.get()).isEqualTo(1);

			assertThat(publisher.accept(raw, start.plusMillis(200))).isFalse();
			assertThat(requests.get()).isEqualTo(1);

			assertThat(publisher.accept(raw, start.plusSeconds(1))).isTrue();
			assertThat(requests.get()).isEqualTo(2);
			assertThat(publisher.accepted()).isEqualTo(2);
			assertThat(publisher.ignored()).isEqualTo(1);
		} finally {
			server.stop(0);
		}
	}

	private String fixture(String name) throws Exception {
		try (InputStream stream = getClass().getResourceAsStream("/gsi/" + name)) {
			if (stream == null) {
				throw new IllegalStateException("Fixture no encontrado: " + name);
			}
			return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

}
