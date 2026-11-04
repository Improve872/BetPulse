package com.betpulse.admin;

import java.util.UUID;

public final class AdminUserDtos {

	private AdminUserDtos() {
	}

	public record AdminUserView(UUID id, String email, String displayName, String status, long availableCents,
			long heldCents, String roles) {
	}

}
