package com.betpulse.collector;

import io.javalin.Javalin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class CollectorApplication {
    private static final Logger LOG = LoggerFactory.getLogger(CollectorApplication.class);
    private static final String TOKEN = System.getenv().getOrDefault("GSI_TOKEN", "betpulse-dev-token");
    private static final Path OUT_DIR = Path.of(System.getenv().getOrDefault("GSI_OUT_DIR", "captures"));
    private static final DateTimeFormatter LOG_TS = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
            .withZone(ZoneId.systemDefault());
    private static final int MAX_BYTES = 10 * 1024 * 1024;

    private CollectorApplication() {
    }

    public static void main(String[] args) throws IOException {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 3001;
        Files.createDirectories(OUT_DIR);

        Javalin app = Javalin.create();
        app.get("/health", ctx -> ctx.result("ok"));
        app.post("/gsi", ctx -> {
            String body = ctx.body();
            if (body == null || body.isBlank()) {
                ctx.status(400).result("empty body");
                return;
            }
            if (body.getBytes(StandardCharsets.UTF_8).length > MAX_BYTES) {
                ctx.status(413).result("payload too large");
                return;
            }
            if (!TOKEN.equals(extract(body, "token"))) {
                ctx.status(401).result("invalid token");
                return;
            }
            persist(body);
            ctx.status(200).result("ok");
        });
        app.start("127.0.0.1", port);

        LOG.info("BetPulse collector listening on http://127.0.0.1:{}", port);
        LOG.info("POST /gsi | GET /health");
        LOG.info("Output: {}", OUT_DIR.toAbsolutePath());
    }

    private static synchronized void persist(String body) throws IOException {
        Instant now = Instant.now();
        String line = body.replace("\r", "").replace("\n", " ") + "\n";
        Path jsonl = OUT_DIR.resolve("gsi-" + LocalDate.now() + ".jsonl");
        Files.writeString(jsonl, line, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.APPEND);
        Files.writeString(OUT_DIR.resolve("latest.json"), body, StandardCharsets.UTF_8,
                StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);
        LOG.info("[{}] {} bytes | {}", LOG_TS.format(now), body.length(), summarize(body));
    }

    private static String summarize(String json) {
        return "match=" + extract(json, "matchid")
                + " state=" + extract(json, "game_state")
                + " time=" + extract(json, "game_time")
                + " score=" + extract(json, "radiant_score") + "-" + extract(json, "dire_score")
                + " win=" + extract(json, "win_team")
                + " events=" + (json.contains("\"events\"") ? "present" : "0");
    }

    private static String extract(String json, String key) {
        Pattern pattern = Pattern.compile(
                "\"" + Pattern.quote(key) + "\"\\s*:\\s*(\"[^\"]*\"|-?\\d+(?:\\.\\d+)?|true|false|null)");
        Matcher matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1).replace("\"", "") : null;
    }
}
