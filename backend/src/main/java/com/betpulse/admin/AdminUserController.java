package com.betpulse.admin;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.admin.AdminUserDtos.AdminUserView;
import com.betpulse.identity.AppUserPrincipal;
import com.betpulse.wallet.WalletDtos.WalletOperationResponse;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@RestController
@RequestMapping("/api/admin/users")
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

	private final AdminUserService adminUserService;

	public AdminUserController(AdminUserService adminUserService) {
		this.adminUserService = adminUserService;
	}

	@GetMapping
	public List<AdminUserView> search(@RequestParam(required = false) String query) {
		return adminUserService.search(query);
	}

	@PostMapping("/{userId}/wallet-adjustments")
	public WalletOperationResponse adjust(@PathVariable UUID userId,
			@RequestHeader("Idempotency-Key") String idempotencyKey,
			@RequestBody @Valid AdjustmentRequest request, Authentication authentication) {
		return adminUserService.adjust(userId, actor(authentication), request.amountCents(), request.reason(),
				idempotencyKey);
	}

	private static UUID actor(Authentication authentication) {
		return ((AppUserPrincipal) authentication.getPrincipal()).getId();
	}

	public record AdjustmentRequest(
			@NotNull @Min(-1_000_000) @Max(1_000_000) Long amountCents,
			@NotBlank @Size(max = 200) String reason) {
	}

}
