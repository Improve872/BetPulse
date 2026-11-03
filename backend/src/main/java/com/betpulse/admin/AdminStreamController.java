package com.betpulse.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.catalog.StreamDtos.StreamView;
import com.betpulse.identity.AppUserPrincipal;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/streams")
@PreAuthorize("hasRole('ADMIN')")
public class AdminStreamController {

	private final AdminStreamService adminStreamService;

	public AdminStreamController(AdminStreamService adminStreamService) {
		this.adminStreamService = adminStreamService;
	}

	@GetMapping
	public List<StreamView> list() {
		return adminStreamService.list();
	}

	@PostMapping
	public StreamView save(@RequestBody @Valid SaveRequest request, Authentication authentication) {
		return adminStreamService.save(actor(authentication), request.matchId(), request.leagueId(),
				request.provider(), request.channelOrVideo(), request.label(), request.fallbackUrl(),
				request.enabled());
	}

	@PostMapping("/{id}/enabled")
	public StreamView setEnabled(@PathVariable long id, @RequestBody @Valid EnabledRequest request,
			Authentication authentication) {
		return adminStreamService.setEnabled(actor(authentication), id, request.enabled());
	}

	@DeleteMapping("/{id}")
	public void delete(@PathVariable long id, Authentication authentication) {
		adminStreamService.delete(actor(authentication), id);
	}

	private static UUID actor(Authentication authentication) {
		return ((AppUserPrincipal) authentication.getPrincipal()).getId();
	}

	public record SaveRequest(String matchId, Long leagueId, @NotBlank @Size(max = 16) String provider,
			@NotBlank @Size(max = 200) String channelOrVideo, @Size(max = 120) String label,
			@Size(max = 500) String fallbackUrl, Boolean enabled) {
	}

	public record EnabledRequest(boolean enabled) {
	}

}
