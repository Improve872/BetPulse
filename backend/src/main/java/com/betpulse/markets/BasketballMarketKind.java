package com.betpulse.markets;

/**
 * Mercados pre-partida de baloncesto (sin empate). Viven separados de
 * {@link MarketKind} y de {@link FootballMarketKind} para que cada deporte
 * publique solo sus mercados.
 */
public enum BasketballMarketKind {

	MATCH_RESULT_2WAY("Ganador", false),
	TOTAL_POINTS("Total de puntos", true);

	private final String title;
	private final boolean lineRequired;

	BasketballMarketKind(String title, boolean lineRequired) {
		this.title = title;
		this.lineRequired = lineRequired;
	}

	public String title() {
		return title;
	}

	public boolean lineRequired() {
		return lineRequired;
	}

}
