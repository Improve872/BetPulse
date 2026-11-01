package com.betpulse.collector;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.InputStream;
import java.util.UUID;

import org.junit.jupiter.api.Test;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

class GsiNormalizerTest {

	private final ObjectMapper objectMapper = new ObjectMapper();
	private final GsiNormalizer normalizer = new GsiNormalizer(objectMapper);

	@Test
	void normalizesSpectatorPayloadWithTenPlayers() throws Exception {
		JsonNode root = load("spectator-first-blood.json");

		NormalizedBatch batch = normalizer.normalize(root, UUID.randomUUID(), UUID.randomUUID(),
				"2026-11-01T18:00:00Z");

		assertThat(batch.matchId()).isEqualTo("9072345549");
		assertThat(batch.clockTime()).isEqualTo(76);
		assertThat(batch.gameTime()).isEqualTo(309);
		assertThat(batch.gameState()).isEqualTo("DOTA_GAMERULES_STATE_GAME_IN_PROGRESS");
		assertThat(batch.radiantScore()).isEqualTo(1);
		assertThat(batch.direScore()).isZero();
		assertThat(batch.players()).hasSize(10);
		assertThat(batch.players()).extracting(NormalizedBatch.Player::team)
				.containsOnly("radiant", "dire");
		assertThat(batch.buildings()).hasSize(36);
		assertThat(batch.roshan()).isNotNull();
		assertThat(batch.events()).extracting(NormalizedBatch.Event::type)
				.contains("FIRST_BLOOD");
		assertThat(batch.events()).allMatch(event -> event.eventId().startsWith("9072345549:"));
	}

	@Test
	void normalizesLocalBotPayloadWithPartialData() throws Exception {
		JsonNode root = load("local-first-blood.json");

		NormalizedBatch batch = normalizer.normalize(root, UUID.randomUUID(), UUID.randomUUID(),
				"2026-11-01T18:10:00Z");

		assertThat(batch.matchId()).isEqualTo("9072388087");
		assertThat(batch.players()).hasSize(1);
		assertThat(batch.players().getFirst().team()).isEqualTo("radiant");
		assertThat(batch.buildings()).isNotEmpty();
		assertThat(batch.roshan()).isNull();
		assertThat(batch.events()).extracting(NormalizedBatch.Event::type).contains("FIRST_BLOOD");
		assertThat(batch.events().getFirst().team()).isEqualTo("dire");
	}

	@Test
	void keepsFinalResultFromPostGame() throws Exception {
		JsonNode root = load("spectator-post-game.json");

		NormalizedBatch batch = normalizer.normalize(root, UUID.randomUUID(), UUID.randomUUID(),
				"2026-11-01T18:20:00Z");

		assertThat(batch.gameState()).isEqualTo("DOTA_GAMERULES_STATE_POST_GAME");
		assertThat(batch.winTeam()).isEqualTo("radiant");
		assertThat(batch.radiantScore()).isEqualTo(44);
		assertThat(batch.direScore()).isEqualTo(27);
	}

	@Test
	void ignoresPayloadsWithoutMatchId() {
		JsonNode root = objectMapper.createObjectNode();

		assertThat(normalizer.normalize(root, UUID.randomUUID(), UUID.randomUUID(), "2026-11-01T18:00:00Z"))
				.isNull();
	}

	private JsonNode load(String name) throws Exception {
		try (InputStream stream = getClass().getResourceAsStream("/gsi/" + name)) {
			if (stream == null) {
				throw new IllegalStateException("Fixture no encontrado: " + name);
			}
			return objectMapper.readTree(stream);
		}
	}

}
