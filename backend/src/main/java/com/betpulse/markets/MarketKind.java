package com.betpulse.markets;

public enum MarketKind {

	MATCH_WINNER("Ganador del mapa", false),
	TOTAL_KILLS("Total de kills", true),
	KILL_HANDICAP("Hándicap de kills", true),
	DURATION("Duración", true);

	private final String title;
	private final boolean lineRequired;

	MarketKind(String title, boolean lineRequired) {
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
