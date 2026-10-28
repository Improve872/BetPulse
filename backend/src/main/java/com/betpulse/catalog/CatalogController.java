package com.betpulse.catalog;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.catalog.LobbyDtos.LobbyResponse;

@RestController
@RequestMapping("/api/catalog")
public class CatalogController {

	private final CatalogService catalogService;

	public CatalogController(CatalogService catalogService) {
		this.catalogService = catalogService;
	}

	@GetMapping("/lobby")
	public LobbyResponse lobby() {
		return catalogService.getLobby();
	}

}
