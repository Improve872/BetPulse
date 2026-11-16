package com.betpulse.shared.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Duration;

import org.junit.jupiter.api.Test;

class RateLimiterTest {

	private static final long T0 = 1_700_000_000_000L;
	private static final Duration WINDOW = Duration.ofMinutes(1);

	private final RateLimiter limiter = new RateLimiter();

	@Test
	void allowsUpToTheLimitThenBlocks() {
		for (int attempt = 1; attempt <= 5; attempt++) {
			assertThat(limiter.check("user", 5, WINDOW, T0).allowed()).isTrue();
		}

		RateLimiter.Decision blocked = limiter.check("user", 5, WINDOW, T0 + 1_000);
		assertThat(blocked.allowed()).isFalse();
		assertThat(blocked.retryAfterSeconds()).isEqualTo(59);
	}

	@Test
	void opensANewWindowWhenTimePasses() {
		for (int attempt = 1; attempt <= 5; attempt++) {
			limiter.check("user", 5, WINDOW, T0);
		}
		assertThat(limiter.check("user", 5, WINDOW, T0 + 59_999).allowed()).isFalse();
		assertThat(limiter.check("user", 5, WINDOW, T0 + 60_000).allowed()).isTrue();
	}

	@Test
	void keepsKeysIndependent() {
		for (int attempt = 1; attempt <= 5; attempt++) {
			limiter.check("login|ip:10.0.0.1", 5, WINDOW, T0);
		}

		assertThat(limiter.check("login|ip:10.0.0.1", 5, WINDOW, T0).allowed()).isFalse();
		assertThat(limiter.check("login|ip:10.0.0.2", 5, WINDOW, T0).allowed()).isTrue();
	}

}
