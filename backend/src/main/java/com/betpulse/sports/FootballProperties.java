package com.betpulse.sports;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Parámetros de los mercados pre-partida de fútbol: fortaleza de equipos,
 * ventana de publicación y plazo para anular un partido sin resultado.
 */
@ConfigurationProperties(prefix = "betpulse.football")
public class FootballProperties {

	private boolean schedulerEnabled = true;
	private Duration standingsTtl = Duration.ofHours(6);
	private int shrinkageGames = 6;
	private double homeAdvantage = 1.10;
	private double fallbackGoalsPerTeam = 1.35;
	private Duration resultVoidAfter = Duration.ofHours(12);

	public boolean isSchedulerEnabled() {
		return schedulerEnabled;
	}

	public void setSchedulerEnabled(boolean schedulerEnabled) {
		this.schedulerEnabled = schedulerEnabled;
	}

	public Duration getStandingsTtl() {
		return standingsTtl;
	}

	public void setStandingsTtl(Duration standingsTtl) {
		this.standingsTtl = standingsTtl;
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

	public double getFallbackGoalsPerTeam() {
		return fallbackGoalsPerTeam;
	}

	public void setFallbackGoalsPerTeam(double fallbackGoalsPerTeam) {
		this.fallbackGoalsPerTeam = fallbackGoalsPerTeam;
	}

	public Duration getResultVoidAfter() {
		return resultVoidAfter;
	}

	public void setResultVoidAfter(Duration resultVoidAfter) {
		this.resultVoidAfter = resultVoidAfter;
	}

}
