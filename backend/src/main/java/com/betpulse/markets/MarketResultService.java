package com.betpulse.markets;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.betpulse.markets.MarketOutcomeResolver.Resolution;
import com.betpulse.markets.MarketResultStore.ResolvableMarket;
import com.betpulse.markets.MarketResultStore.ResolvedMarket;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Traduce resultados finales de partida en resultados por mercado. Es
 * idempotente: cada mercado se resuelve una sola vez y nunca se reabre.
 */
@Service
public class MarketResultService {

	private static final Logger log = LoggerFactory.getLogger(MarketResultService.class);
	private static final int BATCH_SIZE = 50;

	private final MarketResultStore store;
	private final MarketOutcomeResolver resolver;
	private final ObjectMapper objectMapper;

	public MarketResultService(MarketResultStore store, MarketOutcomeResolver resolver, ObjectMapper objectMapper) {
		this.store = store;
		this.resolver = resolver;
		this.objectMapper = objectMapper;
	}

	public int runOnce() {
		List<ResolvableMarket> markets = store.findResolvable(BATCH_SIZE);
		int resolved = 0;
		for (ResolvableMarket market : markets) {
			Resolution resolution = resolver.resolve(market.marketKey(), market.line(), market.matchStatus(),
					market.radiantWin(), market.radiantScore(), market.direScore(), market.durationSeconds());
			String outcome = resolution.voided() ? "VOID" : "SETTLED";
			store.save(new ResolvedMarket(market.marketId(), market.matchId(), outcome,
					resolution.winningSelectionKey(), detailsJson(market, resolution)));
			resolved++;
			log.info("Mercado {} de {} resuelto como {}{}", market.marketKey(), market.matchId(), outcome,
					resolution.voided() ? "" : " -> " + resolution.winningSelectionKey());
		}
		return resolved;
	}

	private String detailsJson(ResolvableMarket market, Resolution resolution) {
		Map<String, Object> details = new LinkedHashMap<>();
		details.put("line", market.line());
		details.put("matchStatus", market.matchStatus());
		details.put("radiantWin", market.radiantWin());
		details.put("radiantScore", market.radiantScore());
		details.put("direScore", market.direScore());
		details.put("durationSeconds", market.durationSeconds());
		details.put("outcome", resolution.voided() ? "VOID" : "SETTLED");
		details.put("winningSelectionKey", resolution.winningSelectionKey());
		try {
			return objectMapper.writeValueAsString(details);
		} catch (JsonProcessingException exception) {
			log.warn("No se pudieron serializar los detalles del mercado {}: {}", market.marketId(),
					exception.getMessage());
			return "{}";
		}
	}

}
