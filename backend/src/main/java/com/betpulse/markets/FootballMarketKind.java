package com.betpulse.markets;

/**
 * Mercados pre-partida de fútbol. Viven separados de {@link MarketKind} para
 * que el bucle de mercados en vivo de Dota no los cree en partidas de Dota.
 */
public enum FootballMarketKind {

	MATCH_RESULT_1X2("Resultado (1X2)", false),
	TOTAL_GOALS("Total de goles", true);

	private final String title;
	private final boolean lineRequired;

	FootballMarketKind(String title, boolean lineRequired) {
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
