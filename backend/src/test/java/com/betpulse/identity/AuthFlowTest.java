package com.betpulse.identity;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import com.betpulse.IntegrationTestBase;

class AuthFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void registerCreatesSessionAndWallet() throws Exception {
		String email = email();
		MvcResult result = mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(registerBody(email)))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.user.email").value(email))
				.andExpect(jsonPath("$.user.roles[0]").value("USER"))
				.andReturn();

		MockHttpSession session = (MockHttpSession) result.getRequest().getSession(false);

		mockMvc.perform(get("/api/auth/me").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.email").value(email));

		mockMvc.perform(get("/api/wallet").session(session))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.availableCents").value(0))
				.andExpect(jsonPath("$.heldCents").value(0))
				.andExpect(jsonPath("$.currency").value("PEN"));
	}

	@Test
	void loginAndLogout() throws Exception {
		String email = email();
		register(email);

		MvcResult login = mockMvc.perform(post("/api/auth/login")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(loginBody(email, "Secret123")))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.user.email").value(email))
				.andReturn();

		MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
		mockMvc.perform(get("/api/auth/me").session(session))
				.andExpect(status().isOk());

		mockMvc.perform(post("/api/auth/logout").session(session).with(csrf()))
				.andExpect(status().isNoContent());

		mockMvc.perform(get("/api/auth/me").session(session))
				.andExpect(status().isUnauthorized());
	}

	@Test
	void wrongPasswordIsRejected() throws Exception {
		String email = email();
		register(email);

		mockMvc.perform(post("/api/auth/login")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(loginBody(email, "Wrong1234")))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
	}

	@Test
	void duplicateEmailIsRejected() throws Exception {
		String email = email();
		register(email);

		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(registerBody(email)))
				.andExpect(status().isConflict())
				.andExpect(jsonPath("$.code").value("EMAIL_TAKEN"));
	}

	@Test
	void weakPasswordIsRejected() throws Exception {
		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Test","email":"%s","password":"abcdefgh","acceptsTerms":true,"isAdult":true}
						""".formatted(email())))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.code").value("WEAK_PASSWORD"));
	}

	@Test
	void walletRequiresAuthentication() throws Exception {
		mockMvc.perform(get("/api/wallet"))
				.andExpect(status().isUnauthorized())
				.andExpect(jsonPath("$.code").value("UNAUTHENTICATED"));
	}

	@Test
	void mutationWithoutCsrfIsRejected() throws Exception {
		mockMvc.perform(post("/api/auth/register")
				.contentType(MediaType.APPLICATION_JSON)
				.content(registerBody(email())))
				.andExpect(status().isForbidden());
	}

	private void register(String email) throws Exception {
		mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content(registerBody(email)))
				.andExpect(status().isCreated());
	}

	private String registerBody(String email) {
		return """
				{"displayName":"Test User","email":"%s","password":"Secret123","acceptsTerms":true,"isAdult":true}
				""".formatted(email);
	}

	private String loginBody(String email, String password) {
		return """
				{"email":"%s","password":"%s"}
				""".formatted(email, password);
	}

	private String email() {
		return "user-" + UUID.randomUUID() + "@betpulse.test";
	}

}
