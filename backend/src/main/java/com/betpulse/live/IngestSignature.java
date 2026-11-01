package com.betpulse.live;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Clock;
import java.time.Instant;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.stereotype.Component;

/**
 * Valida la firma HMAC-SHA256 del colector: hex(HMAC(secret, timestamp + "." + body)).
 */
@Component
public class IngestSignature {

	private static final String ALGORITHM = "HmacSHA256";

	private final IngestProperties properties;
	private final Clock clock;

	public IngestSignature(IngestProperties properties, Clock clock) {
		this.properties = properties;
		this.clock = clock;
	}

	public boolean isValid(String timestamp, String signature, String body) {
		if (isBlank(timestamp) || isBlank(signature) || body == null) {
			return false;
		}
		long epochSeconds;
		try {
			epochSeconds = Long.parseLong(timestamp.trim());
		} catch (NumberFormatException exception) {
			return false;
		}
		long skew = Math.abs(clock.instant().getEpochSecond() - epochSeconds);
		if (skew > properties.getTimestampWindow().toSeconds()) {
			return false;
		}
		String expected = sign(properties.getSecret(), timestamp.trim() + "." + body);
		return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
				signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
	}

	public static String sign(String secret, String payload) {
		try {
			Mac mac = Mac.getInstance(ALGORITHM);
			mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), ALGORITHM));
			byte[] digest = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
			StringBuilder builder = new StringBuilder(digest.length * 2);
			for (byte value : digest) {
				builder.append(Character.forDigit((value >> 4) & 0xF, 16));
				builder.append(Character.forDigit(value & 0xF, 16));
			}
			return builder.toString();
		} catch (Exception exception) {
			throw new IllegalStateException("No se pudo calcular la firma HMAC", exception);
		}
	}

	public Instant now() {
		return clock.instant();
	}

	private static boolean isBlank(String value) {
		return value == null || value.isBlank();
	}

}
