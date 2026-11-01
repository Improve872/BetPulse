package com.betpulse.collector;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class SignatureTest {

	@Test
	void matchesKnownHmacVector() {
		String signature = Signature.sign("secret", "1700000000.{}");

		assertThat(signature).isEqualTo("b8569b78799ff9e3cbff0fc2d63a33a2b57f3282abd07c37ae5e8e7d79a5f163");
	}

	@Test
	void detectsTamperedPayload() {
		String signature = Signature.sign("secret", "1700000000.{\"a\":1}");

		assertThat(Signature.matches("secret", "1700000000.{\"a\":1}", signature)).isTrue();
		assertThat(Signature.matches("secret", "1700000000.{\"a\":2}", signature)).isFalse();
		assertThat(Signature.matches("other", "1700000000.{\"a\":1}", signature)).isFalse();
	}

}
