package com.betpulse.admin;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.markets.MarketDtos.MarketView;
import com.betpulse.markets.MarketService;
import com.betpulse.shared.error.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class AdminMarketService {

	private static final String OPEN = "OPEN";
	private static final String SUSPENDED = "SUSPENDED";
	private static final BigDecimal MIN_ODDS = new BigDecimal("1.001");

	private final JdbcTemplate jdbcTemplate;
	private final ObjectMapper objectMapper;
	private final MarketService marketService;

	public AdminMarketService(JdbcTemplate jdbcTemplate, ObjectMapper objectMapper, MarketService marketService) {
		this.jdbcTemplate = jdbcTemplate;
		this.objectMapper = objectMapper;
		this.marketService = marketService;
	}

	public List<MarketView> list() {
		return marketService.getLiveMarkets().markets();
	}

	@Transactional
	public void suspend(UUID marketId, UUID actorUserId, String reason) {
		MarketRow market = lock(marketId);
		if (!OPEN.equals(market.status()) && !SUSPENDED.equals(market.status())) {
			throw ApiException.conflict("MARKET_NOT_SUSPENDABLE", "El mercado ya no se puede suspender.");
		}
		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = ?, suspended_at = COALESCE(suspended_at, now()),
				    updated_at = now()
				WHERE id = ?
				""", SUSPENDED, reason, marketId);
		audit(actorUserId, "MARKET_SUSPENDED", market, Map.of("reason", reason));
	}

	@Transactional
	public void resume(UUID marketId, UUID actorUserId, String reason) {
		MarketRow market = lock(marketId);
		if (!SUSPENDED.equals(market.status())) {
			throw ApiException.conflict("MARKET_NOT_SUSPENDED", "El mercado no está suspendido.");
		}
		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = NULL, suspended_at = NULL, updated_at = now()
				WHERE id = ?
				""", OPEN, marketId);
		audit(actorUserId, "MARKET_RESUMED", market, Map.of("reason", reason));
	}

	@Transactional
	public void override(UUID marketId, UUID actorUserId, String selectionKey, BigDecimal odds, String reason) {
		if (odds == null || odds.compareTo(MIN_ODDS) < 0) {
			throw ApiException.badRequest("INVALID_ODDS", "La cuota debe ser mayor o igual a 1.001.");
		}
		String key = selectionKey == null ? "" : selectionKey.trim().toUpperCase();
		MarketRow market = lock(marketId);
		if (!OPEN.equals(market.status()) && !SUSPENDED.equals(market.status())) {
			throw ApiException.conflict("MARKET_NOT_OVERRIDABLE", "El mercado ya no admite cambios.");
		}
		BigDecimal probability = jdbcTemplate.query("""
				SELECT probability FROM selections WHERE market_id = ? AND selection_key = ?
				""", (resultSet, rowNumber) -> resultSet.getBigDecimal("probability"), marketId, key)
				.stream().findFirst()
				.orElseThrow(() -> ApiException.notFound("SELECTION_NOT_FOUND", "La selección no existe."));
		BigDecimal normalized = odds.setScale(3, RoundingMode.HALF_UP);
		jdbcTemplate.update("""
				UPDATE selections SET odds = ?, updated_at = now()
				WHERE market_id = ? AND selection_key = ?
				""", normalized, marketId, key);
		Integer version = jdbcTemplate.queryForObject("""
				UPDATE markets SET version = version + 1, updated_at = now()
				WHERE id = ?
				RETURNING version
				""", Integer.class, marketId);
		jdbcTemplate.update("""
				INSERT INTO odds_history (market_id, version, selection_key, probability, odds, source)
				VALUES (?, ?, ?, ?, ?, 'ADMIN_OVERRIDE')
				""", marketId, version, key, probability, normalized);
		audit(actorUserId, "MARKET_OVERRIDE", market, Map.of(
				"selectionKey", key,
				"odds", normalized,
				"previousVersion", market.version(),
				"reason", reason == null ? "" : reason));
	}

	private MarketRow lock(UUID marketId) {
		List<MarketRow> rows = jdbcTemplate.query("""
				SELECT id, match_id, market_key, title, status, version
				FROM markets WHERE id = ?
				FOR UPDATE
				""", (resultSet, rowNumber) -> new MarketRow(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("market_key"),
				resultSet.getString("title"),
				resultSet.getString("status"),
				resultSet.getInt("version")), marketId);
		return rows.stream().findFirst()
				.orElseThrow(() -> ApiException.notFound("MARKET_NOT_FOUND", "El mercado no existe."));
	}

	private void audit(UUID actorUserId, String action, MarketRow market, Map<String, Object> details) {
		Map<String, Object> payload = new LinkedHashMap<>(details);
		payload.put("matchId", market.matchId());
		payload.put("marketKey", market.marketKey());
		try {
			jdbcTemplate.update("""
					INSERT INTO audit_logs (actor_user_id, action, entity_type, entity_id, details)
					VALUES (?, ?, 'MARKET', ?, CAST(? AS jsonb))
					""", actorUserId, action, market.id().toString(),
					objectMapper.writeValueAsString(payload));
		} catch (JsonProcessingException exception) {
			throw new IllegalStateException("No se pudo serializar la auditoría del mercado", exception);
		}
	}

	public record MarketRow(UUID id, String matchId, String marketKey, String title, String status, int version) {
	}

}
