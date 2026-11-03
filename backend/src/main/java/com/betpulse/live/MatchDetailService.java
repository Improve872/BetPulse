package com.betpulse.live;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.betpulse.catalog.CatalogService;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.live.IngestDtos.Batch;
import com.betpulse.live.MatchDetailDtos.BuildingView;
import com.betpulse.live.MatchDetailDtos.EventView;
import com.betpulse.live.MatchDetailDtos.MatchDetail;
import com.betpulse.live.MatchDetailDtos.PlayerView;
import com.betpulse.live.MatchDetailDtos.RoshanView;

@Service
public class MatchDetailService {

	private static final int EVENT_LIMIT = 50;

	private final GsiLiveRegistry registry;
	private final CatalogService catalogService;
	private final JdbcTemplate jdbcTemplate;

	public MatchDetailService(GsiLiveRegistry registry, CatalogService catalogService, JdbcTemplate jdbcTemplate) {
		this.registry = registry;
		this.catalogService = catalogService;
		this.jdbcTemplate = jdbcTemplate;
	}

	public Optional<MatchDetail> find(String matchId) {
		Optional<GsiLiveRegistry.Entry> entry = registry.find(matchId);
		if (entry.isPresent()) {
			return Optional.of(fromGsi(entry.get(), events(matchId)));
		}
		return catalogMatch(matchId).map(match -> new MatchDetail(match, List.of(), List.of(), List.of(), null));
	}

	private MatchDetail fromGsi(GsiLiveRegistry.Entry entry, List<EventView> events) {
		Batch batch = entry.batch();
		LobbyResponse lobby = catalogService.getLobby();
		LobbyMatch match = lobby.live().stream()
				.filter(candidate -> candidate.id().equals(batch.matchId()))
				.findFirst()
				.orElseGet(() -> fallbackMatch(batch));
		List<PlayerView> players = batch.players() == null ? List.of()
				: batch.players().stream()
						.map(player -> new PlayerView(player.accountId(), player.name(), player.team(),
								player.slot(), player.kills(), player.deaths(), player.assists(),
								player.lastHits(), player.denies(), player.netWorth(), player.gpm(), player.xpm()))
						.toList();
		List<BuildingView> buildings = batch.buildings() == null ? List.of()
				: batch.buildings().stream()
						.map(building -> new BuildingView(building.name(), building.health(), building.maxHealth()))
						.toList();
		RoshanView roshan = batch.roshan() == null ? null
				: new RoshanView(batch.roshan().alive(), batch.roshan().phaseTimeRemaining());
		return new MatchDetail(match, events, players, buildings, roshan);
	}

	private LobbyMatch fallbackMatch(Batch batch) {
		return new LobbyMatch(batch.matchId(), "dota2", "live", "Mi partida", "gsi", "",
				System.currentTimeMillis() / 1000 - batch.clockTime(), batch.clockTime(),
				new com.betpulse.catalog.LobbyDtos.LobbyTeam("Radiant", batch.radiantScore(), "radiant", null, null),
				new com.betpulse.catalog.LobbyDtos.LobbyTeam("Dire", batch.direScore(), "dire", null, null),
				null, null, null, "GSI", "FULL", batch.paused(), batch.roshan() != null);
	}

	private Optional<LobbyMatch> catalogMatch(String matchId) {
		LobbyResponse lobby = catalogService.getLobby();
		List<LobbyMatch> all = new ArrayList<>(lobby.live());
		all.addAll(lobby.recent());
		return all.stream().filter(match -> match.id().equals(matchId)).findFirst();
	}

	private List<EventView> events(String matchId) {
		List<EventView> events = new ArrayList<>(jdbcTemplate.query("""
				SELECT event_id, event_type, clock_time, team
				FROM game_events
				WHERE match_id = ?
				ORDER BY clock_time DESC, id DESC
				LIMIT ?
				""", (resultSet, rowNumber) -> new EventView(
				resultSet.getString("event_id"),
				resultSet.getString("event_type"),
				resultSet.getInt("clock_time"),
				resultSet.getString("team")), matchId, EVENT_LIMIT));
		Collections.reverse(events);
		return events;
	}

}
