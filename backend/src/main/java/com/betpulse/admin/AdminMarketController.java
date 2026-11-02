package com.betpulse.admin;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.identity.AppUserPrincipal;
import com.betpulse.markets.MarketDtos.MarketView;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/markets")
@PreAuthorize("hasRole('ADMIN')")
public class AdminMarketController {

	private final AdminMarketService adminMarketService;

	public AdminMarketController(AdminMarketService adminMarketService) {
		this.adminMarketService = adminMarketService;
	}

	@GetMapping
	public List<MarketView> list() {
		return adminMarketService.list();
	}

	@PostMapping("/{marketId}/suspend")
	public void suspend(@PathVariable UUID marketId, @RequestBody @Valid ReasonRequest request,
			Authentication authentication) {
		adminMarketService.suspend(marketId, actor(authentication), request.reason());
	}

	@PostMapping("/{marketId}/resume")
	public void resume(@PathVariable UUID marketId, @RequestBody @Valid ReasonRequest request,
			Authentication authentication) {
		adminMarketService.resume(marketId, actor(authentication), request.reason());
	}

	@PostMapping("/{marketId}/override")
	public void override(@PathVariable UUID marketId, @RequestBody @Valid OverrideRequest request,
			Authentication authentication) {
		adminMarketService.override(marketId, actor(authentication), request.selectionKey(), request.odds(),
				request.reason());
	}

	private static UUID actor(Authentication authentication) {
		return ((AppUserPrincipal) authentication.getPrincipal()).getId();
	}

	public record ReasonRequest(@NotBlank @Size(max = 200) String reason) {
	}

	public record OverrideRequest(@NotBlank @Size(max = 40) String selectionKey,
			@NotNull @DecimalMin("1.001") BigDecimal odds, @Size(max = 200) String reason) {
	}

}
