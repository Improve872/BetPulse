package com.betpulse.admin;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
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

/**
 * Un usuario autenticado sin rol ADMIN no debe poder leer ni operar el panel.
 * La comprobación es a nivel de método (@PreAuthorize), no solo de ruta.
 */
class AccessControlFlowTest extends IntegrationTestBase {

	@Autowired
	private MockMvc mockMvc;

	@Test
	void regularUserCannotReadAdminPanels() throws Exception {
		MockHttpSession session = registerUser();

		mockMvc.perform(get("/api/admin/bets").session(session))
				.andExpect(status().isForbidden())
				.andExpect(jsonPath("$.code").value("FORBIDDEN"));

		mockMvc.perform(get("/api/admin/markets").session(session))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/admin/streams").session(session))
				.andExpect(status().isForbidden());

		mockMvc.perform(get("/api/admin/users?query=test").session(session))
				.andExpect(status().isForbidden());
	}

	@Test
	void regularUserCannotOperateAdminActions() throws Exception {
		MockHttpSession session = registerUser();
		UUID randomId = UUID.randomUUID();

		mockMvc.perform(post("/api/admin/bets/{betId}/void", randomId)
				.session(session)
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"reason\":\"prueba\"}"))
				.andExpect(status().isForbidden());

		mockMvc.perform(post("/api/admin/markets/{marketId}/suspend", randomId)
				.session(session)
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"reason\":\"prueba\"}"))
				.andExpect(status().isForbidden());

		mockMvc.perform(post("/api/admin/users/{userId}/wallet-adjustments", randomId)
				.session(session)
				.with(csrf())
				.header("Idempotency-Key", "adjust-" + UUID.randomUUID())
				.contentType(MediaType.APPLICATION_JSON)
				.content("{\"amountCents\":1000,\"reason\":\"prueba\"}"))
				.andExpect(status().isForbidden());

		mockMvc.perform(delete("/api/admin/streams/{id}", 1L)
				.session(session)
				.with(csrf()))
				.andExpect(status().isForbidden());
	}

	@Test
	void anonymousCannotReachAdminPanels() throws Exception {
		mockMvc.perform(get("/api/admin/bets"))
				.andExpect(status().isUnauthorized());
		mockMvc.perform(get("/api/admin/users"))
				.andExpect(status().isUnauthorized());
	}

	private MockHttpSession registerUser() throws Exception {
		MvcResult result = mockMvc.perform(post("/api/auth/register")
				.with(csrf())
				.contentType(MediaType.APPLICATION_JSON)
				.content("""
						{"displayName":"Regular User","email":"acl-%s@betpulse.test","password":"Secret123","acceptsTerms":true,"isAdult":true}
						""".formatted(UUID.randomUUID())))
				.andExpect(status().isCreated())
				.andReturn();
		return (MockHttpSession) result.getRequest().getSession(false);
	}

}
