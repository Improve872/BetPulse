package com.betpulse.sports;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

/**
 * Subconjunto de la tabla de posiciones de ESPN. Las estadísticas reales
 * (goles a favor y en contra) alimentan el modelo Poisson pre-partida.
 */
public final class EspnStandingsDtos {

	private EspnStandingsDtos() {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Standings(String id, String name, List<Child> children) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Child(StandingsInfo standings) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record StandingsInfo(List<Entry> entries) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Entry(TeamRef team, List<Stat> stats) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record TeamRef(String id, String displayName) {
	}

	@JsonIgnoreProperties(ignoreUnknown = true)
	public record Stat(String name, Double value) {
	}

}
