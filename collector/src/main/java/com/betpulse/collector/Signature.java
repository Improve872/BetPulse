package com.betpulse.collector;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

public final class Signature {

	private static final String ALGORITHM = "HmacSHA256";

	private Signature() {
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

	public static boolean matches(String secret, String payload, String signature) {
		if (signature == null) {
			return false;
		}
		String expected = sign(secret, payload);
		return MessageDigest.isEqual(expected.getBytes(StandardCharsets.UTF_8),
				signature.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
	}

}
