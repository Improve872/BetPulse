package com.betpulse.sports;

import java.time.Duration;
import java.util.ArrayList;
import java.util.List;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "betpulse.espn")
public class EspnProperties {

	private boolean schedulerEnabled = true;
	private String baseUrl = "https://site.api.espn.com/apis/site/v2/sports";
	private String standingsBaseUrl = "https://site.api.espn.com/apis/v2/sports";
	private Duration requestTimeout = Duration.ofSeconds(7);
	private Duration pollInterval = Duration.ofMinutes(5);
	private Duration staleAfter = Duration.ofMinutes(20);
	private int horizonDays = 10;
	private List<League> leagues = new ArrayList<>(List.of(
			new League("eng.1", "Premier League"),
			new League("esp.1", "LaLiga"),
			new League("ger.1", "Bundesliga"),
			new League("ita.1", "Serie A"),
			new League("fra.1", "Ligue 1")));

	public boolean isSchedulerEnabled() {
		return schedulerEnabled;
	}

	public void setSchedulerEnabled(boolean schedulerEnabled) {
		this.schedulerEnabled = schedulerEnabled;
	}

	public String getBaseUrl() {
		return baseUrl;
	}

	public void setBaseUrl(String baseUrl) {
		this.baseUrl = baseUrl;
	}

	public String getStandingsBaseUrl() {
		return standingsBaseUrl;
	}

	public void setStandingsBaseUrl(String standingsBaseUrl) {
		this.standingsBaseUrl = standingsBaseUrl;
	}

	public Duration getRequestTimeout() {
		return requestTimeout;
	}

	public void setRequestTimeout(Duration requestTimeout) {
		this.requestTimeout = requestTimeout;
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

	public int getHorizonDays() {
		return horizonDays;
	}

	public void setHorizonDays(int horizonDays) {
		this.horizonDays = horizonDays;
	}

	public List<League> getLeagues() {
		return leagues;
	}

	public void setLeagues(List<League> leagues) {
		this.leagues = leagues;
	}

	public static class League {

		private String slug;
		private String name;

		public League() {
		}

		public League(String slug, String name) {
			this.slug = slug;
			this.name = name;
		}

		public String getSlug() {
			return slug;
		}

		public void setSlug(String slug) {
			this.slug = slug;
		}

		public String getName() {
			return name;
		}

		public void setName(String name) {
			this.name = name;
		}

	}

}
