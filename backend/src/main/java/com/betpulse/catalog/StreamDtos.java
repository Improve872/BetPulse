package com.betpulse.catalog;

import java.time.Instant;

public final class StreamDtos {

	private StreamDtos() {
	}

	public record StreamView(long id, String matchId, Long leagueId, String provider, String channelOrVideo,
			String label, String fallbackUrl, boolean enabled, Instant updatedAt) {
	}

}
