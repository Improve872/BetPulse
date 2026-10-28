package com.betpulse.markets;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.markets.MarketDtos.LiveMarketsResponse;

@RestController
@RequestMapping("/api/markets")
public class MarketController {

	private final MarketService marketService;

	public MarketController(MarketService marketService) {
		this.marketService = marketService;
	}

	@GetMapping("/live")
	public LiveMarketsResponse live() {
		return marketService.getLiveMarkets();
	}

}
