package com.betpulse.sports;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.sports.SportsDtos.FixturesResponse;

@RestController
@RequestMapping("/api/sports")
public class SportsController {

	private final FixturesService fixturesService;

	public SportsController(FixturesService fixturesService) {
		this.fixturesService = fixturesService;
	}

	@GetMapping("/fixtures")
	public FixturesResponse fixtures() {
		return fixturesService.getFixtures();
	}

}
