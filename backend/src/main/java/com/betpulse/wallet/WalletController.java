package com.betpulse.wallet;

import java.util.List;
import java.util.UUID;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.identity.AppUserPrincipal;
import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletDtos.AmountRequest;
import com.betpulse.wallet.WalletDtos.WalletBalanceResponse;
import com.betpulse.wallet.WalletDtos.WalletOperationResponse;
import com.betpulse.wallet.WalletDtos.WalletTransactionResponse;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/wallet")
public class WalletController {

	private final WalletService walletService;

	public WalletController(WalletService walletService) {
		this.walletService = walletService;
	}

	@GetMapping
	public WalletBalanceResponse balance(@AuthenticationPrincipal AppUserPrincipal principal) {
		return walletService.getBalance(currentUserId(principal));
	}

	@PostMapping("/deposits")
	public WalletOperationResponse deposit(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestHeader("Idempotency-Key") String idempotencyKey,
			@Valid @RequestBody AmountRequest request) {
		return walletService.deposit(currentUserId(principal), request.amountCents(), idempotencyKey);
	}

	@PostMapping("/withdrawals")
	public WalletOperationResponse withdraw(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestHeader("Idempotency-Key") String idempotencyKey,
			@Valid @RequestBody AmountRequest request) {
		return walletService.withdraw(currentUserId(principal), request.amountCents(), idempotencyKey);
	}

	@GetMapping("/transactions")
	public List<WalletTransactionResponse> transactions(@AuthenticationPrincipal AppUserPrincipal principal,
			@RequestParam(defaultValue = "20") int limit) {
		return walletService.listTransactions(currentUserId(principal), limit);
	}

	private UUID currentUserId(AppUserPrincipal principal) {
		if (principal == null) {
			throw ApiException.unauthorized("Autenticación requerida.");
		}
		return principal.getId();
	}

}
