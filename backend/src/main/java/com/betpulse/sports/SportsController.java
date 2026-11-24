package com.betpulse.sports;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.sports.SportsDtos.FixturesResponse;

@RestController
@RequestMapping("/api/sports")
public class SportsController {

	private final FixturesService fixturesService;
	private final FootballMarketService footballMarketService;

	public SportsController(FixturesService fixturesService, FootballMarketService footballMarketService) {
		this.fixturesService = fixturesService;
		this.footballMarketService = footballMarketService;
	}

	@GetMapping("/fixtures")
	public FixturesResponse fixtures() {
		return footballMarketService.withMarkets(fixturesService.getFixtures());
	}

}
