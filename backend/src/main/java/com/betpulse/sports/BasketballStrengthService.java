package com.betpulse.sports;

import java.time.Clock;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.betpulse.markets.TeamStrength;
import com.betpulse.sports.EspnStandingsDtos.Child;
import com.betpulse.sports.EspnStandingsDtos.Entry;
import com.betpulse.sports.EspnStandingsDtos.Standings;
import com.betpulse.sports.EspnStandingsDtos.Stat;

/**
 * Fortaleza ofensiva y defensiva por equipo de NBA desde la tabla real de
 * ESPN. ESPN separa la tabla por conferencia, así que se agregan todas las
 * entradas. Sin tabla se usa la media de liga sin inventar fuerzas.
 */
@Service
public class BasketballStrengthService {

	private static final Logger log = LoggerFactory.getLogger(BasketballStrengthService.class);

	private final EspnStandingsClient client;
	private final BasketballProperties properties;
	private final Clock clock;
	private final Map<String, CachedStrength> cache = new HashMap<>();

	public BasketballStrengthService(EspnStandingsClient client, BasketballProperties properties, Clock clock) {
		this.client = client;
		this.properties = properties;
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
				log.warn("Sin tabla de NBA para {}: {}", leagueSlug, exception.getMessage());
				if (cached != null) {
					return cached.strength();
				}
				return LeagueStrength.fallback(properties.getFallbackPointsPerTeam());
			}
		}
	}

	public TeamStrength team(LeagueStrength strength, long teamId) {
		return Optional.ofNullable(strength.teams().get(teamId)).orElseGet(TeamStrength::neutral);
	}

	private LeagueStrength load(String leagueSlug) {
		Standings standings = client.fetchForSport("basketball", leagueSlug);
		if (standings.children() == null || standings.children().isEmpty()) {
			return LeagueStrength.fallback(properties.getFallbackPointsPerTeam());
		}

		double totalPointsFor = 0;
		double totalGames = 0;
		for (Child child : standings.children()) {
			if (child.standings() == null || child.standings().entries() == null) {
				continue;
			}
			for (Entry entry : child.standings().entries()) {
				totalPointsFor += stat(entry, "pointsFor");
				totalGames += stat(entry, "gamesPlayed");
			}
		}
		double leagueAverage = totalGames <= 0
				? properties.getFallbackPointsPerTeam()
				: totalPointsFor / totalGames;
		if (!Double.isFinite(leagueAverage) || leagueAverage <= 50) {
			leagueAverage = properties.getFallbackPointsPerTeam();
		}

		Map<Long, TeamStrength> teams = new HashMap<>();
		int shrinkage = Math.max(1, properties.getShrinkageGames());
		for (Child child : standings.children()) {
			if (child.standings() == null || child.standings().entries() == null) {
				continue;
			}
			for (Entry entry : child.standings().entries()) {
				if (entry.team() == null || entry.team().id() == null) {
					continue;
				}
				long teamId = parseId(entry.team().id());
				if (teamId <= 0) {
					continue;
				}
				double played = stat(entry, "gamesPlayed");
				double pointsFor = stat(entry, "pointsFor");
				double pointsAgainst = stat(entry, "pointsAgainst");
				if (played <= 0) {
					teams.put(teamId, TeamStrength.neutral());
					continue;
				}
				double attack = ((pointsFor + shrinkage * leagueAverage) / (played + shrinkage)) / leagueAverage;
				double defense = ((pointsAgainst + shrinkage * leagueAverage) / (played + shrinkage)) / leagueAverage;
				teams.put(teamId, new TeamStrength(
						clamp(attack, 0.75, 1.30),
						clamp(defense, 0.75, 1.30),
						(int) played));
			}
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
