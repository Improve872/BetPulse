package com.betpulse.markets;

/**
 * Fortaleza de un equipo frente a la media de su liga. La usan los modelos
 * pre-partida (fútbol y baloncesto) para convertir la tabla real en goles o
 * puntos esperados.
 */
public record TeamStrength(double attack, double defense, int played) {

	public static TeamStrength neutral() {
		return new TeamStrength(1.0, 1.0, 0);
	}

}
