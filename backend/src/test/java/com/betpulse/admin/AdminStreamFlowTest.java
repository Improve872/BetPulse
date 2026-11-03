package com.betpulse.admin;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;

import com.betpulse.IntegrationTestBase;
import com.betpulse.catalog.LobbyDtos.StreamRef;
import com.betpulse.catalog.StreamDtos.StreamView;
import com.betpulse.catalog.StreamService;

class AdminStreamFlowTest extends IntegrationTestBase {

	@Autowired
	private StreamService streamService;

	@Autowired
	private AdminStreamService adminStreamService;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@Test
	void savesUpdatesAndResolvesMatchStreamBeforeLeagueStream() {
		UUID adminId = adminId();
		String matchId = "stream-" + UUID.randomUUID().toString().substring(0, 18);
		long leagueId = 90_000 + Math.abs(matchId.hashCode() % 1_000);

		StreamView league = adminStreamService.save(adminId, null, leagueId, "YOUTUBE", "video-league",
				"Liga", "https://youtube.com/watch?v=video-league", true);
		StreamView match = adminStreamService.save(adminId, matchId, null, "TWITCH", "channel-one",
				"Partida", "https://twitch.tv/channel-one", true);

		assertThat(streamService.list()).extracting(StreamView::id).contains(league.id(), match.id());
		StreamRef resolved = streamService.findRef(matchId, leagueId);
		assertThat(resolved).isNotNull();
		assertThat(resolved.provider()).isEqualTo("TWITCH");
		assertThat(resolved.channelOrVideo()).isEqualTo("channel-one");

		StreamView updated = adminStreamService.save(adminId, matchId, null, "TWITCH", "channel-two",
				"Partida", null, true);
		assertThat(updated.id()).isEqualTo(match.id());
		assertThat(streamService.list()).hasSize(2);
		assertThat(streamService.findRef(matchId, leagueId).channelOrVideo()).isEqualTo("channel-two");

		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs WHERE action = 'STREAM_SAVED' AND entity_id = ?
				""", Integer.class, String.valueOf(match.id()))).isEqualTo(2);
	}

	@Test
	void togglesAndDeletesStream() {
		UUID adminId = adminId();
		String matchId = "stream-" + UUID.randomUUID().toString().substring(0, 18);
		StreamView stream = adminStreamService.save(adminId, matchId, null, "TWITCH", "channel",
				null, null, true);

		adminStreamService.setEnabled(adminId, stream.id(), false);
		assertThat(streamService.findRef(matchId, null)).isNull();

		adminStreamService.setEnabled(adminId, stream.id(), true);
		assertThat(streamService.findRef(matchId, null)).isNotNull();

		adminStreamService.delete(adminId, stream.id());
		assertThat(streamService.findRef(matchId, null)).isNull();
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs WHERE action = 'STREAM_TOGGLED' AND entity_id = ?
				""", Integer.class, String.valueOf(stream.id()))).isEqualTo(2);
		assertThat(jdbcTemplate.queryForObject("""
				SELECT count(*) FROM audit_logs WHERE action = 'STREAM_DELETED' AND entity_id = ?
				""", Integer.class, String.valueOf(stream.id()))).isEqualTo(1);
	}

	private UUID adminId() {
		return jdbcTemplate.queryForObject("SELECT id FROM users WHERE email = 'admin@betpulse.local'",
				UUID.class);
	}

}
