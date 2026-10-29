package com.betpulse.markets;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import com.betpulse.markets.MarketDtos.LiveMarketsResponse;
import com.betpulse.markets.MarketDtos.MarketView;
import com.betpulse.markets.MarketDtos.SelectionView;

@WebMvcTest(controllers = MarketController.class)
@AutoConfigureMockMvc(addFilters = false)
class MarketControllerTest {

	@Autowired
	private MockMvc mockMvc;

	@MockitoBean
	private MarketService marketService;

	@Test
	void returnsLiveMarkets() throws Exception {
		when(marketService.getLiveMarkets()).thenReturn(sampleResponse());

		mockMvc.perform(get("/api/markets/live"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.markets[0].matchId").value("123"))
				.andExpect(jsonPath("$.markets[0].status").value("OPEN"))
				.andExpect(jsonPath("$.markets[0].version").value(3))
				.andExpect(jsonPath("$.markets[0].selections[0].key").value("DIRE"))
				.andExpect(jsonPath("$.markets[0].selections[0].odds").value(2.35));
	}

	private static LiveMarketsResponse sampleResponse() {
		Instant now = Instant.parse("2026-10-26T12:00:00Z");
		MarketView market = new MarketView(UUID.randomUUID(), "123", "MATCH_WINNER", "MATCH_WINNER",
				"Ganador del mapa", "OPEN", null, 3, null, now,
				List.of(new SelectionView("DIRE", "Dire", new BigDecimal("0.40000000"), new BigDecimal("2.350")),
						new SelectionView("RADIANT", "Radiant", new BigDecimal("0.60000000"),
								new BigDecimal("1.570"))));
		return new LiveMarketsResponse(List.of(market), now);
	}

}
