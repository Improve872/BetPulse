import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.concurrent.Executors;

public class CaptureGsi {
    private static final String TOKEN = System.getenv().getOrDefault("GSI_TOKEN", "betpulse-dev-token");
    private static final Path OUT_DIR = Path.of(System.getenv().getOrDefault("GSI_OUT_DIR", "captures"));
    private static final DateTimeFormatter LOG_TS = DateTimeFormatter.ofPattern("HH:mm:ss.SSS")
            .withZone(ZoneId.systemDefault());
    private static final int MAX_BYTES = 10 * 1024 * 1024;

    public static void main(String[] args) throws Exception {
        int port = args.length > 0 ? Integer.parseInt(args[0]) : 3001;
        Files.createDirectories(OUT_DIR);

        HttpServer server = HttpServer.create(new InetSocketAddress("127.0.0.1", port), 0);
        server.createContext("/", CaptureGsi::handle);
        server.setExecutor(Executors.newFixedThreadPool(4));
        Runtime.getRuntime().addShutdownHook(new Thread(() -> server.stop(0)));
        server.start();

        System.out.println("BetPulse GSI capture");
        System.out.println("Escuchando en http://127.0.0.1:" + port + "/");
        System.out.println("Salida: " + OUT_DIR.toAbsolutePath());
        System.out.println("Token requerido: ver gamestate_integration_betpulse.cfg");
        System.out.println("Detener con Ctrl+C");
    }

    private static synchronized void handle(HttpExchange exchange) throws IOException {
        try {
            if (!"POST".equalsIgnoreCase(exchange.getRequestMethod())) {
                respond(exchange, 405, "POST only");
                return;
            }

            byte[] body = exchange.getRequestBody().readAllBytes();
            if (body.length == 0) {
                respond(exchange, 400, "empty body");
                return;
            }
            if (body.length > MAX_BYTES) {
                respond(exchange, 413, "payload too large");
                return;
            }

            String json = new String(body, StandardCharsets.UTF_8);
            String receivedToken = extract(json, "token");
            if (!TOKEN.equals(receivedToken)) {
                System.err.println("[" + LOG_TS.format(Instant.now()) + "] Token GSI invalido; payload descartado");
                respond(exchange, 401, "invalid token");
                return;
            }

            Instant now = Instant.now();
            String jsonLine = json.replace("\r", "").replace("\n", " ") + "\n";
            Path jsonl = OUT_DIR.resolve("gsi-" + LocalDate.now() + ".jsonl");
            Files.writeString(jsonl, jsonLine, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.APPEND);
            Files.writeString(OUT_DIR.resolve("latest.json"), json, StandardCharsets.UTF_8,
                    StandardOpenOption.CREATE, StandardOpenOption.TRUNCATE_EXISTING);

            System.out.println("[" + LOG_TS.format(now) + "] " + body.length + " bytes | " + summarize(json));
            respond(exchange, 200, "ok");
        } catch (Exception e) {
            System.err.println("ERROR: " + e.getMessage());
            respond(exchange, 500, "error");
        }
    }

    private static String summarize(String json) {
        String matchId = extract(json, "matchid");
        String gameTime = extract(json, "game_time");
        String gameState = extract(json, "game_state");
        String radiant = extract(json, "radiant_score");
        String dire = extract(json, "dire_score");
        String winTeam = extract(json, "win_team");
        String events = json.contains("\"events\"") ? "present" : "0";
        return "match=" + matchId
                + " state=" + gameState
                + " time=" + gameTime
                + " score=" + radiant + "-" + dire
                + " win=" + winTeam
                + " events=" + events;
    }

    private static String extract(String json, String key) {
        var pattern = java.util.regex.Pattern.compile(
                "\"" + java.util.regex.Pattern.quote(key)
                        + "\"\\s*:\\s*(\"[^\"]*\"|-?\\d+(?:\\.\\d+)?|true|false|null)");
        var matcher = pattern.matcher(json);
        return matcher.find() ? matcher.group(1).replace("\"", "") : null;
    }

    private static void respond(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes(StandardCharsets.UTF_8);
        exchange.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(bytes);
        }
    }
}
