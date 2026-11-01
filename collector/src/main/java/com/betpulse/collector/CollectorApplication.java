package com.betpulse.collector;

import java.io.IOException;
import java.net.URI;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.security.MessageDigest;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import io.javalin.Javalin;
import io.javalin.http.Context;

public final class CollectorApplication {

	private static final Logger LOG = LoggerFactory.getLogger(CollectorApplication.class);
	private static final int MAX_BYTES = 10 * 1024 * 1024;
	private static final DateTimeFormatter LOG_TS = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
			.withZone(ZoneId.systemDefault());

	private CollectorApplication() {
	}

	public static void main(String[] args) throws Exception {
		int port = args.length > 0 ? Integer.parseInt(args[0]) : 3001;
		String token = env("GSI_TOKEN", "betpulse-dev-token");
		Path captureDir = Path.of(env("GSI_OUT_DIR", "captures"));
		boolean captureRaw = Boolean.parseBoolean(env("GSI_CAPTURE_RAW", "false"));
		URI backendUri = URI.create(env("BETPULSE_BACKEND_URL", "http://127.0.0.1:8081"));
		String secret = env("INGEST_SECRET", "betpulse-dev-ingest-secret");
		Path spoolDir = Path.of(env("INGEST_SPOOL_DIR", "spool"));
		long snapshotInterval = Long.parseLong(env("SNAPSHOT_INTERVAL_MS", "1000"));

		ObjectMapper objectMapper = new ObjectMapper();
		Spool spool = new Spool(spoolDir);
		IngestForwarder forwarder = new IngestForwarder(backendUri, secret, spool, objectMapper);
		SnapshotPublisher publisher = new SnapshotPublisher(new GsiNormalizer(objectMapper), forwarder,
				objectMapper, UUID.randomUUID(), snapshotInterval);
		if (captureRaw) {
			Files.createDirectories(captureDir);
		}

		Javalin app = Javalin.create();
		app.get("/health", ctx -> ctx.json(health(forwarder, publisher, backendUri)));
		app.post("/", ctx -> handle(ctx, token, publisher, objectMapper, captureRaw, captureDir));
		app.post("/gsi", ctx -> handle(ctx, token, publisher, objectMapper, captureRaw, captureDir));
		app.start("127.0.0.1", port);

		ScheduledExecutorService retry = Executors.newSingleThreadScheduledExecutor(runnable -> {
			Thread thread = new Thread(runnable, "ingest-spool-retry");
			thread.setDaemon(true);
			return thread;
		});
		retry.scheduleWithFixedDelay(() -> {
			try {
				int failed = forwarder.retryPending();
				if (failed > 0) {
					LOG.warn("Spool: {} batches siguen pendientes", failed);
				}
			} catch (RuntimeException exception) {
				LOG.error("Falló el reintento del spool", exception);
			}
		}, 5, 5, TimeUnit.SECONDS);

		LOG.info("BetPulse collector listening on http://127.0.0.1:{}", port);
		LOG.info("GSI -> {} | sesión {}", backendUri.resolve("/internal/ingest"), publisher.sessionId());
		LOG.info("Snapshot cada {} ms | spool {} | captura cruda {}", snapshotInterval,
				spool.file().toAbsolutePath(), captureRaw ? captureDir.toAbsolutePath() : "desactivada");
	}

	private static void handle(Context ctx, String token, SnapshotPublisher publisher, ObjectMapper objectMapper,
			boolean captureRaw, Path captureDir) {
		String body = ctx.body();
		if (body == null || body.isBlank()) {
			ctx.status(400).result("empty body");
			return;
		}
		if (body.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
			ctx.status(413).result("payload too large");
			return;
		}

		JsonNode root;
		try {
			root = objectMapper.readTree(body);
		} catch (Exception exception) {
			ctx.status(400).result("invalid json");
			return;
		}
		String received = root.path("auth").path("token").asText("");
		if (!constantTimeEquals(token, received)) {
			LOG.warn("Token GSI inválido; payload descartado");
			ctx.status(401).result("invalid token");
			return;
		}

		publisher.accept(body, Instant.now());
		if (captureRaw) {
			persist(body, captureDir);
		}
		ctx.status(200).result("ok");
	}

	private static Map<String, Object> health(IngestForwarder forwarder, SnapshotPublisher publisher,
			URI backendUri) {
		Map<String, Object> health = new LinkedHashMap<>();
		health.put("status", "ok");
		health.put("backend", backendUri.resolve("/internal/ingest").toString());
		health.put("sessionId", publisher.sessionId().toString());
		health.put("queueDepth", forwarder.queueDepth());
		health.put("accepted", publisher.accepted());
		health.put("forwarded", publisher.forwarded());
		health.put("ignored", publisher.ignored());
		health.put("lastSuccessAt", forwarder.lastSuccessAt() == null ? null
				: forwarder.lastSuccessAt().toString());
		health.put("lastError", forwarder.lastError());
		return health;
	}

	private static synchronized void persist(String body, Path captureDir) {
		try {
			String line = body.replace("\r", "").replace("\n", " ") + System.lineSeparator();
			Files.writeString(captureDir.resolve("gsi-" + LocalDate.now() + ".jsonl"), line,
					StandardCharsets.UTF_8, StandardOpenOption.CREATE, StandardOpenOption.APPEND);
			Files.writeString(captureDir.resolve("latest.json"), body, StandardCharsets.UTF_8,
					StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
			LOG.info("[{}] captura cruda guardada ({} bytes)", LOG_TS.format(Instant.now()), body.length());
		} catch (IOException exception) {
			LOG.warn("No se pudo guardar la captura cruda: {}", exception.getMessage());
		}
	}

	private static boolean constantTimeEquals(String expected, String received) {
		if (received == null) {
			return false;
		}
		return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
				received.getBytes(StandardCharsets.UTF_8));
	}

	private static String env(String name, String fallback) {
		String value = System.getenv(name);
		return value == null || value.isBlank() ? fallback : value;
	}

}
