package com.betpulse.catalog;

import java.net.URI;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.catalog.LobbyDtos.LobbyResponse;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

	private final CatalogService catalogService;
	private final TeamLogoCache teamLogoCache;

	public CatalogController(CatalogService catalogService, TeamLogoCache teamLogoCache) {
		this.catalogService = catalogService;
		this.teamLogoCache = teamLogoCache;
	}

	@GetMapping("/lobby")
	public LobbyResponse lobby() {
		return catalogService.getLobby();
	}

	@GetMapping("/teams/{teamId}/logo")
	public ResponseEntity<Void> teamLogo(@PathVariable long teamId) {
		String logoUrl = teamLogoCache.logoUrl(teamId);
		if (logoUrl.isBlank()) {
			return ResponseEntity.notFound().build();
		}
		return ResponseEntity.status(HttpStatus.FOUND).location(URI.create(logoUrl)).build();
	}

}
