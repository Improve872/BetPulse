package com.betpulse.catalog;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

public final class OpenDotaDtos {

	private OpenDotaDtos() {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record LiveMatch(
			@JsonProperty("match_id") Long matchId,
			@JsonProperty("league_id") Long leagueId,
			@JsonProperty("activate_time") Long activateTime,
			@JsonProperty("deactivate_time") Long deactivateTime,
			@JsonProperty("game_time") Long gameTime,
			@JsonProperty("delay") Integer delay,
			@JsonProperty("spectators") Integer spectators,
			@JsonProperty("average_mmr") Integer averageMmr,
			@JsonProperty("radiant_score") Integer radiantScore,
			@JsonProperty("dire_score") Integer direScore,
			@JsonProperty("team_name_radiant") String teamNameRadiant,
			@JsonProperty("team_name_dire") String teamNameDire,
			@JsonProperty("team_id_radiant") Long teamIdRadiant,
			@JsonProperty("team_id_dire") Long teamIdDire,
			@JsonProperty("team_logo_radiant") String teamLogoRadiant,
			@JsonProperty("team_logo_dire") String teamLogoDire,
			@JsonProperty("is_watch_eligible") Boolean watchEligible) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Team(
			@JsonProperty("team_id") Long teamId,
			@JsonProperty("name") String name,
			@JsonProperty("tag") String tag,
			@JsonProperty("logo_url") String logoUrl) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record League(
			@JsonProperty("leagueid") Long leagueId,
			@JsonProperty("name") String name,
			@JsonProperty("tier") String tier) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record MatchDetails(
			@JsonProperty("match_id") Long matchId,
			@JsonProperty("radiant_win") Boolean radiantWin,
			@JsonProperty("radiant_score") Integer radiantScore,
			@JsonProperty("dire_score") Integer direScore,
			@JsonProperty("duration") Long duration,
			@JsonProperty("first_blood_time") Long firstBloodTime,
			@JsonProperty("leagueid") Long leagueId,
			@JsonProperty("start_time") Long startTime,
			@JsonProperty("game_mode") Integer gameMode,
			@JsonProperty("lobby_type") Integer lobbyType,
			@JsonProperty("objectives") List<Objective> objectives) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Objective(
			@JsonProperty("time") Long time,
			@JsonProperty("type") String type,
			@JsonProperty("team") Integer team,
			@JsonProperty("slot") Integer slot,
			@JsonProperty("key") String key) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record ProMatch(
			@JsonProperty("match_id") Long matchId,
			@JsonProperty("duration") Long duration,
			@JsonProperty("start_time") Long startTime,
			@JsonProperty("radiant_name") String radiantName,
			@JsonProperty("dire_name") String direName,
			@JsonProperty("radiant_team_id") Long radiantTeamId,
			@JsonProperty("dire_team_id") Long direTeamId,
			@JsonProperty("league_name") String leagueName,
			@JsonProperty("series_type") Integer seriesType,
			@JsonProperty("radiant_score") Integer radiantScore,
			@JsonProperty("dire_score") Integer direScore,
			@JsonProperty("radiant_win") Boolean radiantWin) {
	}

}
