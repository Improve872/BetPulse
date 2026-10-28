package com.betpulse.markets;

import com.betpulse.markets.MarketDtos.LiveMarketsResponse;

public record MarketsUpdatedEvent(LiveMarketsResponse response) {
}
