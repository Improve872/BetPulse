package com.betpulse.admin;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.catalog.StreamDtos.StreamView;
import com.betpulse.catalog.StreamService;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AdminStreamService {

	private final StreamService streamService;
	private final JdbcTemplate jdbcTemplate;
	private final ObjectMapper objectMapper;

	public AdminStreamService(StreamService streamService, JdbcTemplate jdbcTemplate, ObjectMapper objectMapper) {
		this.streamService = streamService;
		this.jdbcTemplate = jdbcTemplate;
		this.objectMapper = objectMapper;
	}

	public List<StreamView> list() {
		return streamService.list();
	}

	@Transactional
	public StreamView save(UUID actorUserId, String matchId, Long leagueId, String provider, String channelOrVideo,
			String label, String fallbackUrl, Boolean enabled) {
		StreamView stream = streamService.save(matchId, leagueId, provider, channelOrVideo, label, fallbackUrl,
				enabled);
		audit(actorUserId, "STREAM_SAVED", stream, Map.of(
				"provider", stream.provider(),
				"scope", stream.matchId() != null ? "MATCH" : "LEAGUE"));
		return stream;
	}

	@Transactional
	public StreamView setEnabled(UUID actorUserId, long id, boolean enabled) {
		StreamView stream = streamService.setEnabled(id, enabled);
		audit(actorUserId, "STREAM_TOGGLED", stream, Map.of("enabled", enabled));
		return stream;
	}

	@Transactional
	public void delete(UUID actorUserId, long id) {
		StreamView stream = streamService.get(id);
		streamService.delete(id);
		audit(actorUserId, "STREAM_DELETED", stream, Map.of());
	}

	private void audit(UUID actorUserId, String action, StreamView stream, Map<String, Object> details) {
		Map<String, Object> payload = new LinkedHashMap<>(details);
		payload.put("matchId", stream.matchId());
		payload.put("leagueId", stream.leagueId());
		payload.put("channelOrVideo", stream.channelOrVideo());
		try {
			jdbcTemplate.update("""
					INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
					VALUES (?, ?, 'STREAM', ?, CAST(? AS jsonb))
					""", actorUserId, action, String.valueOf(stream.id()),
					objectMapper.writeValueAsString(payload));
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("No se pudo serializar la auditoría del stream", exception);
		}
	}

}
