package com.betpulse.shared.ratelimit;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.betpulse.IntegrationTestBase;

@TestPropertySource(properties = "betpulse.rate-limit.enabled=true")
class RateLimitFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Autowired
	private RateLimiter rateLimiter;

	@BeforeEach
	void resetWindows() {
		rateLimiter.clear();
	}

	@Test
	void loginIsLimitedPerClient() throws Exception {
		for (int attempt = 1; attempt <= 10; attempt++) {
			mockMvc.perform(post("/api/auth/login")
					.with(csrf())
					.contentType(MediaType.APPLICATION_JSON)
					.content(loginBody()))
					.andExpect(status().isUnauthorized());
		}

		mockMvc.perform(post("/api/auth/login")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(loginBody()))
				.andExpect(status().isTooManyRequests())
				.andExpect(header().exists("Retry-After"))
				.andExpect(jsonPath("$.code").value("RATE_LIMITED"));
	}

	@Test
	void clearingWindowsRestoresTheQuota() throws Exception {
		for (int attempt = 1; attempt <= 10; attempt++) {
			mockMvc.perform(post("/api/auth/login")
					.with(csrf())
					.contentType(MediaType.APPLICATION_JSON)
					.content(loginBody()))
					.andExpect(status().isUnauthorized());
		}

		rateLimiter.clear();

		mockMvc.perform(post("/api/auth/login")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(loginBody()))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void authenticatedRequestsUseTheUserKeyAndRunOnce() throws Exception {
		MvcResult registration = mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Limit User","email":"limit-%s@betpulse.test","password":"Secret123","acceptsTerms":true,"isAdult":true}
						""".formatted(java.util.UUID.randomUUID())))
				.andExpect(status().isCreated())
				.andReturn();
		var session = (org.springframework.mock.web.MockHttpSession) registration.getRequest().getSession(false);

		// 30 peticiones inválidas consumen la cuota; si el filtro corriera dos
		// veces por request, el bloqueo llegaría en la número 16.
		for (int attempt = 1; attempt <= 30; attempt++) {
			mockMvc.perform(post("/api/bets")
					.session(session)
					.with(csrf())
					.header("Idempotency-Key", "rate-" + attempt)
					.contentType(MediaType.APPLICATION_JSON)
					.content("{}"))
					.andExpect(status().isBadRequest());
		}

		mockMvc.perform(post("/api/bets")
				.session(session)
				.with(csrf())
				.header("Idempotency-Key", "rate-blocked")
				.contentType(MediaType.APPLICATION_JSON)
				.content("{}"))
				.andExpect(status().isTooManyRequests());
	}

	private String loginBody() {
		return """
				{"email":"nobody@betpulse.test","password":"Wrong1234"}
				""";
	}

}
