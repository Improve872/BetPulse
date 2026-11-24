package com.betpulse.sports;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Parámetros de los mercados pre-partida de baloncesto: ligas, ventana de
 * publicación y plazo para anular un partido sin resultado.
 */
@ConfigurationProperties(prefix = "betpulse.basketball")
public class BasketballProperties {

	private boolean schedulerEnabled = true;
	private Duration pollInterval = Duration.ofMinutes(5);
	private Duration staleAfter = Duration.ofMinutes(20);
	private Duration standingsTtl = Duration.ofHours(6);
	private int horizonDays = 10;
	private int shrinkageGames = 6;
	private double homeAdvantage = 1.02;
	private double fallbackPointsPerTeam = 110.0;
	private Duration resultVoidAfter = Duration.ofHours(12);
	private List<EspnProperties.League> leagues = new ArrayList<>(
			List.of(new EspnProperties.League("nba", "NBA")));

	public boolean isSchedulerEnabled() {
		return schedulerEnabled;
	}

	public void setSchedulerEnabled(boolean schedulerEnabled) {
		this.schedulerEnabled = schedulerEnabled;
	}

	public Duration getPollInterval() {
		return pollInterval;
	}

	public void setPollInterval(Duration pollInterval) {
		this.pollInterval = pollInterval;
	}

	public Duration getStaleAfter() {
		return staleAfter;
	}

	public void setStaleAfter(Duration staleAfter) {
		this.staleAfter = staleAfter;
	}

	public Duration getStandingsTtl() {
		return standingsTtl;
	}

	public void setStandingsTtl(Duration standingsTtl) {
		this.standingsTtl = standingsTtl;
	}

	public int getHorizonDays() {
		return horizonDays;
	}

	public void setHorizonDays(int horizonDays) {
		this.horizonDays = horizonDays;
	}

	public int getShrinkageGames() {
		return shrinkageGames;
	}

	public void setShrinkageGames(int shrinkageGames) {
		this.shrinkageGames = shrinkageGames;
	}

	public double getHomeAdvantage() {
		return homeAdvantage;
	}

	public void setHomeAdvantage(double homeAdvantage) {
		this.homeAdvantage = homeAdvantage;
	}

	public double getFallbackPointsPerTeam() {
		return fallbackPointsPerTeam;
	}

	public void setFallbackPointsPerTeam(double fallbackPointsPerTeam) {
		this.fallbackPointsPerTeam = fallbackPointsPerTeam;
	}

	public Duration getResultVoidAfter() {
		return resultVoidAfter;
	}

	public void setResultVoidAfter(Duration resultVoidAfter) {
		this.resultVoidAfter = resultVoidAfter;
	}

	public List<EspnProperties.League> getLeagues() {
		return leagues;
	}

	public void setLeagues(List<EspnProperties.League> leagues) {
		this.leagues = leagues;
	}

}
