package com.betpulse.live;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.IntegrationTestBase;
import com.betpulse.catalog.OpenDotaClient;
import com.betpulse.catalog.OpenDotaDtos.MatchDetails;
import com.betpulse.catalog.OpenDotaDtos.Objective;
import com.betpulse.live.MatchResultStore.MatchResultRow;

@Transactional
class MatchResultFlowTest extends IntegrationTestBase {

	private static final String MATCH_ID = "9071885340";

	@Autowired
	private MatchResultService matchResultService;

	@Autowired
	private MatchResultStore matchResultStore;

	@Autowired
	private JdbcTemplate jdbcTemplate;

	@MockitoBean
	private OpenDotaClient openDotaClient;

	@Test
	void enqueuesClosedMatchAndPersistsFinalResultOnce() {
		jdbcTemplate.update("""
				INSERT INTO markets (match_id, market_key, market_type, title, status, closed_at)
				VALUES (?, 'MATCH_WINNER', 'MATCH_WINNER', 'Ganador del mapa', 'CLOSED', now())
				""", MATCH_ID);

		matchResultStore.enqueueClosedMatchesWithoutResult();

		MatchResultRow pending = matchResultStore.find(MATCH_ID).orElseThrow();
		assertThat(pending.status()).isEqualTo("PENDING");
		assertThat(pending.attempts()).isZero();

		when(openDotaClient.fetchMatch(9071885340L)).thenReturn(new MatchDetails(
				9071885340L, true, 44, 37, 3078L, 222L, 20395L, 1_793_000_000L, 22, 7,
				List.of(new Objective(222L, "CHAT_MESSAGE_FIRSTBLOOD", null, 9, "0"),
						new Objective(486L, "building_kill", null, 4, "npc_dota_badguys_tower1_top"))));

		matchResultService.resolveNow(MATCH_ID);

		MatchResultRow ready = matchResultStore.find(MATCH_ID).orElseThrow();
		assertThat(ready.status()).isEqualTo("READY");
		assertThat(ready.radiantWin()).isTrue();
		assertThat(ready.radiantScore()).isEqualTo(44);
		assertThat(ready.direScore()).isEqualTo(37);
		assertThat(ready.durationSeconds()).isEqualTo(3078L);
		assertThat(ready.firstBloodTime()).isEqualTo(222L);
		assertThat(ready.leagueId()).isEqualTo(20395L);
		assertThat(ready.resolvedAt()).isNotNull();
		assertThat(ready.attempts()).isEqualTo(1);

		String objectives = jdbcTemplate.queryForObject(
				"SELECT objectives::text FROM match_results WHERE match_id = ?", String.class, MATCH_ID);
		assertThat(objectives).contains("CHAT_MESSAGE_FIRSTBLOOD").contains("npc_dota_badguys_tower1_top");

		matchResultService.resolveNow(MATCH_ID);
		verify(openDotaClient, times(1)).fetchMatch(9071885340L);
	}

	@Test
	void doesNotEnqueueTheSameMatchTwice() {
		jdbcTemplate.update("""
				INSERT INTO markets (match_id, market_key, market_type, title, status, closed_at)
				VALUES (?, 'MATCH_WINNER', 'MATCH_WINNER', 'Ganador del mapa', 'CLOSED', now())
				""", MATCH_ID);

		int first = matchResultStore.enqueueClosedMatchesWithoutResult();
		int second = matchResultStore.enqueueClosedMatchesWithoutResult();

		assertThat(first).isGreaterThanOrEqualTo(1);
		assertThat(second).isZero();
		assertThat(jdbcTemplate.queryForObject(
				"SELECT count(*) FROM match_results WHERE match_id = ?", Integer.class, MATCH_ID)).isEqualTo(1);
	}

}
