package com.betpulse.sports;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.betpulse.markets.FootballOddsModel.TeamStrength;
import com.betpulse.sports.EspnStandingsDtos.Entry;
import com.betpulse.sports.EspnStandingsDtos.Standings;
import com.betpulse.sports.EspnStandingsDtos.Stat;

/**
 * Fortaleza ofensiva y defensiva por equipo a partir de la tabla real de ESPN.
 * Los goles se suavizan hacia la media de la liga para que un equipo con pocos
 * partidos no domine las cuotas. Si ESPN falla, se usa la media de liga sin
 * inventar fortalezas por equipo.
 */
@Service
public class FootballStrengthService {

	private static final Logger log = LoggerFactory.getLogger(FootballStrengthService.class);

	private final EspnStandingsClient client;
	private final FootballProperties properties;
	private final EspnProperties espnProperties;
	private final Clock clock;
	private final Map<String, CachedStrength> cache = new HashMap<>();

	public FootballStrengthService(EspnStandingsClient client, FootballProperties properties,
			EspnProperties espnProperties, Clock clock) {
		this.client = client;
		this.properties = properties;
		this.espnProperties = espnProperties;
		this.clock = clock;
	}

	public LeagueStrength strength(String leagueSlug) {
		Instant now = clock.instant();
		synchronized (this) {
			CachedStrength cached = cache.get(leagueSlug);
			if (cached != null && now.isBefore(cached.loadedAt().plus(properties.getStandingsTtl()))) {
				return cached.strength();
			}
			try {
				LeagueStrength loaded = load(leagueSlug);
				cache.put(leagueSlug, new CachedStrength(loaded, now));
				return loaded;
			} catch (RuntimeException exception) {
				log.warn("Sin tabla de ESPN para {}: {}", leagueSlug, exception.getMessage());
				if (cached != null) {
					return cached.strength();
				}
				return LeagueStrength.fallback(properties.getFallbackGoalsPerTeam());
			}
		}
	}

	public TeamStrength team(LeagueStrength strength, long teamId) {
		return Optional.ofNullable(strength.teams().get(teamId)).orElseGet(TeamStrength::neutral);
	}

	private LeagueStrength load(String leagueSlug) {
		Standings standings = client.fetch(leagueSlug);
		if (standings.children() == null || standings.children().isEmpty()
				|| standings.children().get(0).standings() == null
				|| standings.children().get(0).standings().entries() == null) {
			return LeagueStrength.fallback(properties.getFallbackGoalsPerTeam());
		}

		double totalGoalsFor = 0;
		double totalPlayed = 0;
		for (Entry entry : standings.children().get(0).standings().entries()) {
			totalGoalsFor += stat(entry, "pointsFor");
			totalPlayed += stat(entry, "gamesPlayed");
		}
		double leagueAverage = totalPlayed <= 0
				? properties.getFallbackGoalsPerTeam()
				: totalGoalsFor / totalPlayed;
		if (!Double.isFinite(leagueAverage) || leagueAverage <= 0.2) {
			leagueAverage = properties.getFallbackGoalsPerTeam();
		}

		Map<Long, TeamStrength> teams = new HashMap<>();
		int shrinkage = Math.max(1, properties.getShrinkageGames());
		for (Entry entry : standings.children().get(0).standings().entries()) {
			if (entry.team() == null || entry.team().id() == null) {
				continue;
			}
			long teamId = parseId(entry.team().id());
			if (teamId <= 0) {
				continue;
			}
			double played = stat(entry, "gamesPlayed");
			double goalsFor = stat(entry, "pointsFor");
			double goalsAgainst = stat(entry, "pointsAgainst");
			if (played <= 0) {
				teams.put(teamId, TeamStrength.neutral());
				continue;
			}
			double attack = ((goalsFor + shrinkage * leagueAverage) / (played + shrinkage)) / leagueAverage;
			double defense = ((goalsAgainst + shrinkage * leagueAverage) / (played + shrinkage)) / leagueAverage;
			teams.put(teamId, new TeamStrength(
					clamp(attack, 0.45, 2.2),
					clamp(defense, 0.45, 2.2),
					(int) played));
		}
		return new LeagueStrength(leagueAverage, Map.copyOf(teams));
	}

	private static double stat(Entry entry, String name) {
		if (entry.stats() == null) {
			return 0;
		}
		for (Stat stat : entry.stats()) {
			if (name.equals(stat.name()) && stat.value() != null) {
				return stat.value();
			}
		}
		return 0;
	}

	private static long parseId(String value) {
		try {
			return Long.parseLong(value);
		} catch (NumberFormatException exception) {
			return 0;
		}
	}

	private static double clamp(double value, double min, double max) {
		return Math.max(min, Math.min(max, value));
	}

	/** Solo para tests. */
	synchronized void clearCache() {
		cache.clear();
	}

	public record LeagueStrength(double averagePerTeam, Map<Long, TeamStrength> teams) {

		public static LeagueStrength fallback(double averagePerTeam) {
			return new LeagueStrength(averagePerTeam, Map.of());
		}

	}

	private record CachedStrength(LeagueStrength strength, Instant loadedAt) {
	}

}
