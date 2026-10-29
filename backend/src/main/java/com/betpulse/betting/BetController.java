package com.betpulse.betting;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.betting.BetDtos.BetView;
import com.betpulse.betting.BetDtos.PlaceBetRequest;
import com.betpulse.identity.AppUserPrincipal;
import com.betpulse.shared.error.ApiException;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/bets")
public class BetController {

	private final BetService betService;

	public BetController(BetService betService) {
		this.betService = betService;
	}

	@PostMapping
	public ResponseEntity<BetView> place(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestHeader("Idempotency-Key") String idempotencyKey,
			@Valid @RequestBody PlaceBetRequest request) {
		BetView bet = betService.place(currentUserId(principal), request, idempotencyKey);
		return ResponseEntity.status(bet.replayed() ? HttpStatus.OK : HttpStatus.CREATED).body(bet);
	}

	@GetMapping
	public List<BetView> list(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(defaultValue = "20") int limit) {
		return betService.list(currentUserId(principal), limit);
	}

	@GetMapping("/{id}")
	public BetView get(@AuthenticationPrincipal AppUserPrincipal principal, @PathVariable UUID id) {
		return betService.get(currentUserId(principal), id);
	}

	private UUID currentUserId(AppUserPrincipal principal) {
		if (principal == null) {
			throw ApiException.unauthorized("Autenticación requerida.");
		}
		return principal.getId();
	}

}
