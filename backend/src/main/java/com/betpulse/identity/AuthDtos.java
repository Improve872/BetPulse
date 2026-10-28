package com.betpulse.identity;

import java.util.List;
import java.util.UUID;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AuthDtos {

	private AuthDtos() {
	}

	public record RegisterRequest(
			@NotBlank @Size(max = 80) String displayName,
			@NotBlank @Email @Size(max = 255) String email,
			@NotBlank @Size(min = 8, max = 72) String password,
			boolean acceptsTerms,
			boolean isAdult) {
	}

	public record LoginRequest(
			@NotBlank @Email @Size(max = 255) String email,
			@NotBlank @Size(max = 72) String password) {
	}

	public record UserResponse(UUID id, String email, String displayName, List<String> roles) {
	}

	public record AuthResponse(UserResponse user) {
	}

	public record CsrfResponse(String headerName, String parameterName, String token) {
	}

}
