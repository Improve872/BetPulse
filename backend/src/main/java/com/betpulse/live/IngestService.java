package com.betpulse.live;

import java.sql.Timestamp;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.catalog.CatalogService;
import com.betpulse.catalog.CatalogUpdatedEvent;
import com.betpulse.live.IngestDtos.Batch;
import com.betpulse.live.IngestDtos.Event;
import com.betpulse.live.IngestDtos.Result;
import com.betpulse.shared.error.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class IngestService {

	private static final Logger log = LoggerFactory.getLogger(IngestService.class);
	private static final int SCHEMA_VERSION = 1;

	private final JdbcTemplate jdbcTemplate;
	private final ObjectMapper objectMapper;
	private final GsiLiveRegistry gsiLiveRegistry;
	private final CatalogService catalogService;
	private final ApplicationEventPublisher eventPublisher;

	public IngestService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, GsiLiveRegistry gsiLiveRegistry,
			CatalogService catalogService, ApplicationEventPublisher eventPublisher) {
		this.jdbcTemplate = jdbcTemplate;
		this.objectMapper = objectMapper;
		this.gsiLiveRegistry = gsiLiveRegistry;
		this.catalogService = catalogService;
		this.eventPublisher = eventPublisher;
	}

	@Transactional
	public Result ingest(Batch batch) {
		validate(batch);
		Timestamp capturedAt = Timestamp.from(batch.capturedAt());

		jdbcTemplate.update("""
				INSERT INTO collector_sessions (id, match_id, last_seen_at)
				VALUES (?, ?, now())
				ON CONFLICT (id) DO UPDATE
				SET match_id = EXCLUDED.match_id, last_seen_at = now()
				""", batch.sessionId(), batch.matchId());

		int snapshots = jdbcTemplate.update("""
				INSERT INTO game_snapshots (snapshot_id, session_id, match_id, captured_at, clock_time, game_time,
				    game_state, paused, radiant_score, dire_score, win_team, league_id, league_name,
				    players, buildings, roshan)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), CAST(? AS jsonb), CAST(? AS jsonb))
				ON CONFLICT (snapshot_id) DO NOTHING
				""", batch.snapshotId(), batch.sessionId(), batch.matchId(), capturedAt,
				batch.clockTime(), batch.gameTime(), batch.gameState(), Boolean.TRUE.equals(batch.paused()),
				batch.radiantScore(), batch.direScore(), defaultWinTeam(batch.winTeam()), batch.leagueId(),
				batch.leagueName(), json(batch.players(), "[]"), json(batch.buildings(), "[]"),
				batch.roshan() == null ? null : json(batch.roshan()));

		int events = 0;
		boolean hasEvents = false;
		for (Event event : safe(batch.events())) {
			if (event == null || isBlank(event.eventId()) || isBlank(event.type()) || event.clockTime() == null) {
				continue;
			}
			hasEvents = true;
			events += jdbcTemplate.update("""
					INSERT INTO game_events (match_id, event_id, event_type, clock_time, team, payload)
					VALUES (?, ?, ?, ?, ?, CAST(? AS jsonb))
					ON CONFLICT (match_id, event_id) DO NOTHING
					""", batch.matchId(), event.eventId(), event.type(), event.clockTime(), event.team(),
					event.payload() == null ? null : event.payload().toString());
		}

		jdbcTemplate.update("""
				INSERT INTO ingestion_health (session_id, last_snapshot_at, last_event_at, snapshots_received,
				    events_received)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT (session_id) DO UPDATE
				SET last_snapshot_at = COALESCE(EXCLUDED.last_snapshot_at, ingestion_health.last_snapshot_at),
				    last_event_at = COALESCE(EXCLUDED.last_event_at, ingestion_health.last_event_at),
				    snapshots_received = ingestion_health.snapshots_received + EXCLUDED.snapshots_received,
				    events_received = ingestion_health.events_received + EXCLUDED.events_received,
				    updated_at = now()
				""", batch.sessionId(), capturedAt, hasEvents ? capturedAt : null, snapshots, events);

		gsiLiveRegistry.update(batch);
		storeGsiResultIfFinished(batch);
		eventPublisher.publishEvent(new CatalogUpdatedEvent(catalogService.getLobby()));

		if (snapshots > 0) {
			log.debug("GSI snapshot {} de {} aceptado ({} eventos)", batch.matchId(), batch.snapshotId(), events);
		}
		return new Result(snapshots, events);
	}

	private void storeGsiResultIfFinished(Batch batch) {
		if (!"DOTA_GAMERULES_STATE_POST_GAME".equals(batch.gameState())) {
			return;
		}
		String winTeam = batch.winTeam();
		if (isBlank(winTeam) || "none".equalsIgnoreCase(winTeam) || batch.clockTime() == null) {
			return;
		}
		boolean radiantWin = "radiant".equalsIgnoreCase(winTeam);
		Integer firstBlood = firstBloodTime(batch.events());
		jdbcTemplate.update("""
				INSERT INTO match_results (match_id, status, radiant_win, radiant_score, dire_score,
				    duration_seconds, first_blood_time, league_id, objectives, source, resolved_at)
				VALUES (?, 'READY', ?, ?, ?, ?, ?, ?, CAST(? AS jsonb), 'GSI', now())
				ON CONFLICT (match_id) DO NOTHING
				""", batch.matchId(), radiantWin, batch.radiantScore(), batch.direScore(), batch.clockTime(),
				firstBlood, batch.leagueId(), json(batch.events(), "[]"));
		log.info("Resultado GSI guardado para {}: {}-{}, ganador {}", batch.matchId(), batch.radiantScore(),
				batch.direScore(), winTeam);
	}

	private static Integer firstBloodTime(List<Event> events) {
		if (events == null) {
			return null;
		}
		return events.stream()
				.filter(event -> "FIRST_BLOOD".equals(event.type()))
				.map(Event::clockTime)
				.filter(value -> value != null)
				.findFirst()
				.orElse(null);
	}

	private void validate(Batch batch) {
		if (batch == null) {
			throw ApiException.badRequest("INVALID_INGEST", "El cuerpo del ingest es obligatorio.");
		}
		if (batch.schemaVersion() != null && batch.schemaVersion() > SCHEMA_VERSION) {
			throw ApiException.badRequest("UNSUPPORTED_SCHEMA",
					"Versión de ingest no soportada: " + batch.schemaVersion());
		}
		if (batch.sessionId() == null || batch.snapshotId() == null) {
			throw ApiException.badRequest("INVALID_INGEST", "sessionId y snapshotId son obligatorios.");
		}
		if (isBlank(batch.matchId())) {
			throw ApiException.badRequest("INVALID_INGEST", "matchId es obligatorio.");
		}
		if (batch.matchId().length() > 32) {
			throw ApiException.badRequest("INVALID_INGEST", "matchId excede 32 caracteres.");
		}
		if (batch.capturedAt() == null || batch.clockTime() == null || batch.gameTime() == null
				|| isBlank(batch.gameState())) {
			throw ApiException.badRequest("INVALID_INGEST",
					"capturedAt, clockTime, gameTime y gameState son obligatorios.");
		}
		if (batch.radiantScore() == null || batch.direScore() == null) {
			throw ApiException.badRequest("INVALID_INGEST", "Los marcadores son obligatorios.");
		}
		if (batch.clockTime() < 0 || batch.gameTime() < 0) {
			throw ApiException.badRequest("INVALID_INGEST", "Los tiempos no pueden ser negativos.");
		}
	}

	private String json(Object value, String fallback) {
		if (value == null) {
			return fallback;
		}
		try {
			return objectMapper.writeValueAsString(value);
		} catch (JsonProcessingException exception) {
			throw ApiException.badRequest("INVALID_INGEST", "No se pudo serializar el payload.");
		}
	}

	private String json(Object value) {
		return json(value, "{}");
	}

	private static String defaultWinTeam(String winTeam) {
		return isBlank(winTeam) || "none".equalsIgnoreCase(winTeam) ? "none" : winTeam;
	}

	private static <T> List<T> safe(List<T> values) {
		return values == null ? List.of() : values;
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}

}
