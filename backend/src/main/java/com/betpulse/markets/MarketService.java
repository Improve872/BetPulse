package com.betpulse.markets;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import com.betpulse.catalog.CatalogUpdatedEvent;
import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.markets.MarketDtos.LiveMarketsResponse;
import com.betpulse.markets.MarketDtos.MarketView;
import com.betpulse.markets.MarketDtos.SelectionView;
import com.betpulse.markets.OddsEngine.Quote;

@Service
public class MarketService {

	private static final Logger log = LoggerFactory.getLogger(MarketService.class);
	private static final String OPEN = "OPEN";
	private static final String SUSPENDED = "SUSPENDED";
	private static final String CLOSED = "CLOSED";
	private static final String SETTLED = "SETTLED";
	private static final String VOID = "VOID";
	private static final String SOURCE = "ODDS_ENGINE_V1";

	private final JdbcTemplate jdbcTemplate;
	private final OddsEngine oddsEngine;
	private final Clock clock;
	private final ApplicationEventPublisher eventPublisher;
	private final TransactionTemplate transactionTemplate;

	public MarketService(JdbcTemplate jdbcTemplate, OddsEngine oddsEngine, Clock clock,
			ApplicationEventPublisher eventPublisher, PlatformTransactionManager transactionManager) {
		this.jdbcTemplate = jdbcTemplate;
		this.oddsEngine = oddsEngine;
		this.clock = clock;
		this.eventPublisher = eventPublisher;
		this.transactionTemplate = new TransactionTemplate(transactionManager);
	}

	@EventListener
	public void onCatalogUpdated(CatalogUpdatedEvent event) {
		try {
			transactionTemplate.executeWithoutResult(status -> sync(event.response()));
		} catch (RuntimeException exception) {
			log.error("No se pudieron sincronizar los mercados del catálogo", exception);
		}
	}

	@Transactional
	public synchronized void sync(LobbyResponse lobby) {
		FeedHealth feed = lobby.feed();
		if (!isTrusted(feed)) {
			suspendAll(reason(feed));
			publish();
			return;
		}

		Set<String> liveMatchIds = lobby.live().stream()
				.map(LobbyMatch::id)
				.collect(Collectors.toSet());
		for (LobbyMatch match : lobby.live()) {
			syncMatch(match);
		}
		closeMissing(liveMatchIds);
		publish();
	}

	@Transactional(readOnly = true)
	public LiveMarketsResponse getLiveMarkets() {
		List<MarketRow> rows = jdbcTemplate.query("""
				SELECT m.id, m.match_id, m.market_key, m.market_type, m.title, m.status, m.line, m.version,
				       m.suspension_reason, m.updated_at,
				       s.selection_key, s.label, s.probability, s.odds
				FROM markets m
				JOIN selections s ON s.market_id = m.id
				WHERE m.status IN (?, ?)
				ORDER BY m.match_id,
				         CASE m.market_key
				             WHEN 'MATCH_WINNER' THEN 0
				             WHEN 'TOTAL_KILLS' THEN 1
				             WHEN 'KILL_HANDICAP' THEN 2
				             WHEN 'DURATION' THEN 3
				             ELSE 4
				         END,
				         CASE s.selection_key WHEN 'RADIANT' THEN 0 WHEN 'OVER' THEN 0 WHEN 'DIRE' THEN 1
				             WHEN 'UNDER' THEN 1 ELSE 2 END
				""", (resultSet, rowNumber) -> mapRow(resultSet), OPEN, SUSPENDED);

		Map<UUID, MarketBuilder> markets = new LinkedHashMap<>();
		for (MarketRow row : rows) {
			markets.computeIfAbsent(row.id(), ignored -> new MarketBuilder(row))
					.selections()
					.add(new SelectionView(row.selectionKey(), row.label(), row.probability(), row.odds()));
		}
		List<MarketView> views = markets.values().stream().map(MarketBuilder::build).toList();
		return new LiveMarketsResponse(views, clock.instant());
	}

	private void syncMatch(LobbyMatch match) {
		for (MarketKind kind : MarketKind.values()) {
			syncMarket(match, kind);
		}
	}

	private void syncMarket(LobbyMatch match, MarketKind kind) {
		int radiantKills = match.radiant().score();
		int direKills = match.dire().score();
		long gameTimeSeconds = match.durationSeconds();
		BigDecimal initialLine = oddsEngine.initialLine(kind, radiantKills, direKills, gameTimeSeconds);

		jdbcTemplate.update("""
				INSERT INTO markets (match_id, market_key, market_type, title, line, status, opened_at)
				VALUES (?, ?, ?, ?, CAST(? AS NUMERIC), ?, now())
				ON CONFLICT (match_id, market_key) DO NOTHING
				""", match.id(), kind.name(), kind.name(), kind.title(), initialLine, OPEN);

		MarketState market = jdbcTemplate.queryForObject("""
				SELECT id, status, version, line
				FROM markets
				WHERE match_id = ? AND market_key = ?
				""", (resultSet, rowNumber) -> new MarketState(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("status"),
				resultSet.getInt("version"),
				resultSet.getBigDecimal("line")), match.id(), kind.name());
		if (market == null || isTerminal(market.status())) {
			return;
		}

		if (isDeterministic(kind, market.line(), radiantKills + direKills, gameTimeSeconds)) {
			closeMarket(market.id());
			return;
		}

		List<Quote> quotes = oddsEngine.quotes(kind, radiantKills, direKills, gameTimeSeconds, market.line());
		Map<String, BigDecimal> currentOdds = currentOdds(market.id());
		boolean oddsChanged = currentOdds.size() != quotes.size()
				|| quotes.stream().anyMatch(quote -> !sameOdds(currentOdds, quote));
		int nextVersion = oddsChanged ? market.version() + 1 : market.version();

		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, version = ?, suspension_reason = NULL, suspended_at = NULL,
				    opened_at = COALESCE(opened_at, now()), closed_at = NULL, updated_at = now()
				WHERE id = ?
				""", OPEN, nextVersion, market.id());

		for (Quote quote : quotes) {
			upsertSelection(market.id(), quote);
		}

		if (oddsChanged) {
			for (Quote quote : quotes) {
				insertHistory(market.id(), nextVersion, quote);
			}
			log.info("Mercado {} {} actualizado a versión {} ({})", match.id(), kind,
					nextVersion, oddsSummary(quotes));
		}
	}

	private boolean isDeterministic(MarketKind kind, BigDecimal line, int totalKills, long gameTimeSeconds) {
		if (line == null) {
			return false;
		}
		return switch (kind) {
			case TOTAL_KILLS -> totalKills > line.doubleValue();
			case DURATION -> gameTimeSeconds / 60.0 > line.doubleValue();
			case MATCH_WINNER, KILL_HANDICAP -> false;
		};
	}

	private void upsertSelection(UUID marketId, Quote quote) {
		jdbcTemplate.update("""
				INSERT INTO selections (market_id, selection_key, label, probability, odds)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT (market_id, selection_key) DO UPDATE
				SET label = EXCLUDED.label,
				    probability = EXCLUDED.probability,
				    odds = EXCLUDED.odds,
				    updated_at = now()
				""", marketId, quote.selectionKey(), label(quote.selectionKey()), quote.probability(), quote.odds());
	}

	private void insertHistory(UUID marketId, int version, Quote quote) {
		jdbcTemplate.update("""
				INSERT INTO odds_history (market_id, version, selection_key, probability, odds, source)
				VALUES (?, ?, ?, ?, ?, ?)
				""", marketId, version, quote.selectionKey(), quote.probability(), quote.odds(), SOURCE);
	}

	private void suspendAll(String reason) {
		int updated = jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = ?, suspended_at = COALESCE(suspended_at, now()),
				    updated_at = now()
				WHERE status IN (?, ?)
				""", SUSPENDED, reason, OPEN, SUSPENDED);
		if (updated > 0) {
			log.warn("Mercados suspendidos por salud del feed: {} ({} mercados)", reason, updated);
		}
	}

	private void closeMarket(UUID marketId) {
		int updated = jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = NULL, suspended_at = NULL, closed_at = now(),
				    updated_at = now()
				WHERE id = ? AND status IN (?, ?)
				""", CLOSED, marketId, OPEN, SUSPENDED);
		if (updated > 0) {
			log.info("Mercado {} cerrado por resultado determinista", marketId);
		}
	}

	private void closeMissing(Set<String> liveMatchIds) {
		int updated;
		if (liveMatchIds.isEmpty()) {
			updated = jdbcTemplate.update("""
					UPDATE markets
					SET status = ?, suspension_reason = NULL, suspended_at = NULL, closed_at = now(),
					    updated_at = now()
					WHERE status IN (?, ?)
					""", CLOSED, OPEN, SUSPENDED);
		} else {
			String placeholders = liveMatchIds.stream().map(ignored -> "?").collect(Collectors.joining(", "));
			List<Object> arguments = new ArrayList<>();
			arguments.add(CLOSED);
			arguments.add(OPEN);
			arguments.add(SUSPENDED);
			arguments.addAll(liveMatchIds);
			updated = jdbcTemplate.update("""
					UPDATE markets
					SET status = ?, suspension_reason = NULL, suspended_at = NULL, closed_at = now(),
					    updated_at = now()
					WHERE status IN (?, ?) AND match_id NOT IN (%s)
					""".formatted(placeholders), arguments.toArray());
		}
		if (updated > 0) {
			log.info("Mercados cerrados para partidas que ya no están en vivo: {}", updated);
		}
	}

	private void publish() {
		eventPublisher.publishEvent(new MarketsUpdatedEvent(getLiveMarkets()));
	}

	private Map<String, BigDecimal> currentOdds(UUID marketId) {
		Map<String, BigDecimal> odds = new HashMap<>();
		jdbcTemplate.query("SELECT selection_key, odds FROM selections WHERE market_id = ?", resultSet -> {
			odds.put(resultSet.getString("selection_key"), resultSet.getBigDecimal("odds"));
		}, marketId);
		return odds;
	}

	private static boolean sameOdds(Map<String, BigDecimal> current, Quote quote) {
		BigDecimal existing = current.get(quote.selectionKey());
		return existing != null && existing.compareTo(quote.odds()) == 0;
	}

	private static boolean isTerminal(String status) {
		return CLOSED.equals(status) || SETTLED.equals(status) || VOID.equals(status);
	}

	private static boolean isTrusted(FeedHealth feed) {
		return feed != null && !feed.stale()
				&& ("LIVE".equals(feed.status()) || "DEGRADED".equals(feed.status()));
	}

	private static String reason(FeedHealth feed) {
		if (feed == null) {
			return "FEED_STARTING";
		}
		return switch (feed.status()) {
			case "STALE" -> "FEED_STALE";
			case "DOWN" -> "FEED_DOWN";
			case "STARTING" -> "FEED_STARTING";
			default -> "FEED_UNAVAILABLE";
		};
	}

	private static String label(String selectionKey) {
		return switch (selectionKey) {
			case "RADIANT" -> "Radiant";
			case "DIRE" -> "Dire";
			case "OVER" -> "Over";
			case "UNDER" -> "Under";
			default -> selectionKey;
		};
	}

	private static String oddsSummary(List<Quote> quotes) {
		return quotes.stream()
				.map(quote -> quote.selectionKey() + " " + quote.odds())
				.collect(Collectors.joining(" / "));
	}

	private static MarketRow mapRow(ResultSet resultSet) throws SQLException {
		return new MarketRow(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("market_key"),
				resultSet.getString("market_type"),
				resultSet.getString("title"),
				resultSet.getString("status"),
				resultSet.getBigDecimal("line"),
				resultSet.getInt("version"),
				resultSet.getString("suspension_reason"),
				resultSet.getTimestamp("updated_at").toInstant(),
				resultSet.getString("selection_key"),
				resultSet.getString("label"),
				resultSet.getBigDecimal("probability"),
				resultSet.getBigDecimal("odds"));
	}

	private record MarketState(UUID id, String status, int version, BigDecimal line) {
	}

	private record MarketRow(UUID id, String matchId, String marketKey, String marketType, String title, String status,
			BigDecimal line, int version, String suspensionReason, Instant updatedAt, String selectionKey, String label,
			BigDecimal probability, BigDecimal odds) {
	}

	private static final class MarketBuilder {

		private final MarketRow row;
		private final List<SelectionView> selections = new ArrayList<>();

		private MarketBuilder(MarketRow row) {
			this.row = row;
		}

		private List<SelectionView> selections() {
			return selections;
		}

		private MarketView build() {
			return new MarketView(row.id(), row.matchId(), row.marketKey(), row.marketType(), row.title(), row.status(),
					row.line(), row.version(), row.suspensionReason(), row.updatedAt(), List.copyOf(selections));
		}
	}
}
