package com.betpulse.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.IntegrationTestBase;
import com.betpulse.catalog.CatalogService;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.live.IngestDtos.Batch;
import com.fasterxml.jackson.databind.ObjectMapper;

@Transactional
class IngestFlowTest extends IntegrationTestBase {

	private static final String SNAPSHOT_HEADER = "X-BetPulse-Timestamp";
	private static final String SIGNATURE_HEADER = "X-BetPulse-Signature";

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private ObjectMapper objectMapper;

	@Autowired
	private IngestProperties properties;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Autowired
	private CatalogService catalogService;

	private String body;
	private Batch batch;

	@BeforeEach
	void loadFixture() throws IOException {
		try (InputStream stream = getClass().getResourceAsStream("/gsi/ingest-first-blood.json")) {
			assertThat(stream).isNotNull();
			body = new String(stream.readAllBytes(), StandardCharsets.UTF_8);
		}
		batch = objectMapper.readValue(body, Batch.class);
	}

	@Test
	void acceptsSignedSnapshotAndEventsIdempotently() throws Exception {
		String timestamp = String.valueOf(Instant.now().getEpochSecond());

		postIngest(body, timestamp, IngestSignature.sign(properties.getSecret(), timestamp + "." + body))
				.andExpect(status().isAccepted());

		assertThat(count("collector_sessions", "id = '" + batch.sessionId() + "'")).isEqualTo(1);
		assertThat(count("game_snapshots", "snapshot_id = '" + batch.snapshotId() + "'")).isEqualTo(1);
		assertThat(count("game_events", "match_id = '" + batch.matchId() + "'")).isEqualTo(batch.events().size());

		String health = jdbcTemplate.queryForObject("""
				SELECT snapshots_received || '/' || events_received
				FROM ingestion_health WHERE session_id = ?
				""", String.class, batch.sessionId());
		assertThat(health).isEqualTo("1/" + batch.events().size());

		postIngest(body, timestamp, IngestSignature.sign(properties.getSecret(), timestamp + "." + body))
				.andExpect(status().isAccepted());

		assertThat(count("game_snapshots", "snapshot_id = '" + batch.snapshotId() + "'")).isEqualTo(1);
		assertThat(count("game_events", "match_id = '" + batch.matchId() + "'")).isEqualTo(batch.events().size());
	}

	@Test
	void exposesGsiMatchInLobbyAndCreatesMarkets() throws Exception {
		postSigned(body).andExpect(status().isAccepted());

		LobbyResponse lobby = catalogService.getLobby();
		assertThat(lobby.live())
				.filteredOn(match -> match.id().equals(batch.matchId()))
				.singleElement()
				.satisfies(match -> {
					assertThat(match.source()).isEqualTo("GSI");
					assertThat(match.playersScope()).isEqualTo("FULL");
					assertThat(match.radiant().score()).isEqualTo(1);
					assertThat(match.dire().score()).isZero();
					assertThat(match.tournamentKind()).isEqualTo("gsi");
				});
		assertThat(count("markets", "match_id = '" + batch.matchId() + "'")).isEqualTo(4);
	}

	@Test
	void suspendsGsiMarketsWhileMatchIsPaused() throws Exception {
		postSigned(body).andExpect(status().isAccepted());
		String pauseBody = loadBody("ingest-pause.json");

		postSigned(pauseBody).andExpect(status().isAccepted());

		Integer suspended = jdbcTemplate.queryForObject("""
				SELECT count(*) FROM markets
				WHERE match_id = ? AND status = 'SUSPENDED' AND suspension_reason = 'MATCH_PAUSED'
				""", Integer.class, batch.matchId());
		assertThat(suspended).isEqualTo(4);
	}

	@Test
	void storesFinalResultFromGsiPostGame() throws Exception {
		String postGame = loadBody("ingest-post-game.json");
		Batch postGameBatch = objectMapper.readValue(postGame, Batch.class);

		postSigned(postGame).andExpect(status().isAccepted());

		assertThat(jdbcTemplate.queryForObject("""
				SELECT status || '/' || source || '/' || radiant_win || '/' || radiant_score || '-' || dire_score
				FROM match_results WHERE match_id = ?
				""", String.class, postGameBatch.matchId()))
				.isEqualTo("READY/GSI/true/44-27");
		assertThat(catalogService.getLobby().live())
				.noneMatch(match -> match.id().equals(postGameBatch.matchId()));
	}

	@Test
	void rejectsInvalidSignature() throws Exception {
		String timestamp = String.valueOf(Instant.now().getEpochSecond());

		postIngest(body, timestamp, "deadbeef").andExpect(status().isUnauthorized());

		assertThat(count("game_snapshots", "snapshot_id = '" + batch.snapshotId() + "'")).isZero();
	}

	@Test
	void rejectsExpiredTimestamp() throws Exception {
		String timestamp = String.valueOf(Instant.now().minusSeconds(600).getEpochSecond());

		postIngest(body, timestamp, IngestSignature.sign(properties.getSecret(), timestamp + "." + body))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void rejectsMissingSignatureHeaders() throws Exception {
		mockMvc.perform(post("/internal/ingest")
						.contentType(MediaType.APPLICATION_JSON)
						.content(body))
				.andExpect(status().isUnauthorized());
	}

	private org.springframework.test.web.servlet.ResultActions postSigned(String payload) throws Exception {
		String timestamp = String.valueOf(Instant.now().getEpochSecond());
		return postIngest(payload, timestamp, IngestSignature.sign(properties.getSecret(), timestamp + "." + payload));
	}

	private String loadBody(String name) throws IOException {
		try (InputStream stream = getClass().getResourceAsStream("/gsi/" + name)) {
			assertThat(stream).isNotNull();
			return new String(stream.readAllBytes(), StandardCharsets.UTF_8);
		}
	}

	private org.springframework.test.web.servlet.ResultActions postIngest(String payload, String timestamp,
			String signature) throws Exception {
		return mockMvc.perform(post("/internal/ingest")
				.contentType(MediaType.APPLICATION_JSON)
				.content(payload)
				.header(SNAPSHOT_HEADER, timestamp)
				.header(SIGNATURE_HEADER, signature));
	}

	private int count(String table, String where) {
		Integer count = jdbcTemplate.queryForObject("SELECT count(*) FROM " + table + " WHERE " + where,
				Integer.class);
		return count == null ? 0 : count;
	}

}
