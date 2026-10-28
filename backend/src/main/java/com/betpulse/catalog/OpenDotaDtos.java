package com.betpulse.catalog;

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
			@JsonProperty("is_watch_eligible") Boolean watchEligible) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record ProMatch(
			@JsonProperty("match_id") Long matchId,
			@JsonProperty("duration") Long duration,
			@JsonProperty("start_time") Long startTime,
			@JsonProperty("radiant_name") String radiantName,
			@JsonProperty("dire_name") String direName,
			@JsonProperty("league_name") String leagueName,
			@JsonProperty("series_type") Integer seriesType,
			@JsonProperty("radiant_score") Integer radiantScore,
			@JsonProperty("dire_score") Integer direScore,
			@JsonProperty("radiant_win") Boolean radiantWin) {
	}

}
