package com.betpulse.markets;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import com.betpulse.markets.OddsEngine.Quote;
import com.betpulse.sports.SportsDtos.FixtureMarket;
import com.betpulse.sports.SportsDtos.FixtureSelection;
import com.betpulse.sports.SportsDtos.FixtureView;
import com.betpulse.sports.SportsDtos.FixturesResponse;
import com.betpulse.sports.SportsDtos.LeagueFixtures;

/**
 * Persistencia común de los mercados pre-partida (fútbol y baloncesto):
 * creación, versionado, historial de cuotas, cierre en el kickoff y lectura
 * para la UI. Los modelos de cada deporte solo aportan líneas y cuotas.
 */
@Component
public class PrematchMarketPublisher {

	private static final Logger log = LoggerFactory.getLogger(PrematchMarketPublisher.class);
	private static final String SOURCE = "ESPN";
	private static final String OPEN = "OPEN";
	private static final String CLOSED = "CLOSED";
	private static final String SETTLED = "SETTLED";
	private static final String VOID = "VOID";

	private final JdbcTemplate jdbcTemplate;

	public PrematchMarketPublisher(JdbcTemplate jdbcTemplate) {
		this.jdbcTemplate = jdbcTemplate;
	}

	public void registerResult(String matchId, String sport, String leagueSlug, String eventId, Instant kickoff) {
		jdbcTemplate.update("""
				INSERT INTO sport_results (match_id, sport, league_slug, event_id, kickoff_at)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT (match_id) DO NOTHING
				""", matchId, sport, leagueSlug, eventId, Timestamp.from(kickoff));
	}

	public String resultStatus(String matchId) {
		List<String> rows = jdbcTemplate.queryForList(
				"SELECT status FROM sport_results WHERE match_id = ?", String.class, matchId);
		return rows.isEmpty() ? null : rows.get(0);
	}

	public void publish(String matchId, String sport, String marketKey, String title, BigDecimal line,
			List<Quote> quotes, String historySource, Function<String, String> labels) {
		MarketState market = findMarket(matchId, marketKey);
		if (market == null) {
			jdbcTemplate.update("""
					INSERT INTO markets (match_id, market_key, market_type, title, line, status, source, practice,
					    sport, opened_at)
					VALUES (?, ?, ?, ?, CAST(? AS NUMERIC), ?, ?, false, ?, now())
					ON CONFLICT (match_id, market_key) DO NOTHING
					""", matchId, marketKey, marketKey, title, line, OPEN, SOURCE, sport);
			market = findMarket(matchId, marketKey);
		}
		if (market == null || SETTLED.equals(market.status()) || VOID.equals(market.status())) {
			return;
		}

		Map<String, BigDecimal> current = currentOdds(market.id());
		boolean changed = current.size() != quotes.size()
				|| quotes.stream().anyMatch(quote -> !sameOdds(current, quote));
		int nextVersion = changed ? market.version() + 1 : market.version();

		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, version = ?, suspension_reason = NULL, suspended_at = NULL,
				    opened_at = COALESCE(opened_at, now()), updated_at = now()
				WHERE id = ?
				""", OPEN, nextVersion, market.id());

		for (Quote quote : quotes) {
			jdbcTemplate.update("""
					INSERT INTO selections (market_id, selection_key, label, probability, odds)
					VALUES (?, ?, ?, ?, ?)
					ON CONFLICT (market_id, selection_key) DO UPDATE
					SET label = EXCLUDED.label,
					    probability = EXCLUDED.probability,
					    odds = EXCLUDED.odds,
					    updated_at = now()
					""", market.id(), quote.selectionKey(), labels.apply(quote.selectionKey()),
					quote.probability(), quote.odds());
			if (changed) {
				jdbcTemplate.update("""
						INSERT INTO odds_history (market_id, version, selection_key, probability, odds, source)
						VALUES (?, ?, ?, ?, ?, ?)
						""", market.id(), nextVersion, quote.selectionKey(), quote.probability(), quote.odds(),
						historySource);
			}
		}
	}

	/** Cierra todos los mercados de un deporte cuyo partido ya empezó. */
	public void closeStarted(String sport) {
		int closed = jdbcTemplate.update("""
				UPDATE markets m
				SET status = ?, suspension_reason = NULL, suspended_at = NULL,
				    closed_at = COALESCE(m.closed_at, now()), updated_at = now()
				FROM sport_results r
				WHERE r.match_id = m.match_id AND m.sport = ? AND r.kickoff_at <= now()
				  AND m.status IN (?, 'SUSPENDED')
				""", CLOSED, sport, OPEN);
		if (closed > 0) {
			log.info("Mercados de {} cerrados por inicio de partido: {}", sport, closed);
		}
	}

	public void closeMarkets(String matchId) {
		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = NULL, suspended_at = NULL,
				    closed_at = COALESCE(closed_at, now()), updated_at = now()
				WHERE match_id = ? AND status IN (?, 'SUSPENDED')
				""", CLOSED, matchId, OPEN);
	}

	public FixturesResponse attachMarkets(FixturesResponse response, String sport, String prefix) {
		List<String> matchIds = new ArrayList<>();
		for (LeagueFixtures league : response.leagues()) {
			for (FixtureView fixture : league.fixtures()) {
				matchIds.add(fixture.id());
			}
		}
		if (matchIds.isEmpty()) {
			return response;
		}
		Map<String, List<FixtureMarket>> markets = loadMarkets(matchIds, sport, prefix);
		List<LeagueFixtures> leagues = response.leagues().stream()
				.map(league -> new LeagueFixtures(league.id(), league.name(), league.fixtures().stream()
						.map(fixture -> fixture.withMarkets(markets.getOrDefault(fixture.id(), List.of())))
						.toList()))
				.toList();
		return new FixturesResponse(response.sport(), response.updatedAt(), response.status(),
				response.lastSuccessAt(), response.lastError(), leagues);
	}

	private MarketState findMarket(String matchId, String marketKey) {
		List<MarketState> rows = jdbcTemplate.query("""
				SELECT id, status, version, line
				FROM markets
				WHERE match_id = ? AND market_key = ?
				""", (resultSet, rowNumber) -> new MarketState(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("status"),
				resultSet.getInt("version"),
				resultSet.getBigDecimal("line")), matchId, marketKey);
		return rows.stream().findFirst().orElse(null);
	}

	private Map<String, List<FixtureMarket>> loadMarkets(List<String> matchIds, String sport, String prefix) {
		// Los fixtures llevan el id de ESPN; el mercado usa el prefijo del deporte.
		List<String> marketIds = matchIds.stream().map(id -> prefix + id).toList();
		String placeholders = marketIds.stream().map(ignored -> "?").collect(Collectors.joining(", "));
		List<Object> arguments = new ArrayList<>(marketIds);
		arguments.add(sport);
		List<MarketRow> rows = jdbcTemplate.query("""
				SELECT m.id, m.match_id, m.market_key, m.title, m.line, m.version, m.status,
				       s.selection_key, s.label, s.probability, s.odds
				FROM markets m
				JOIN selections s ON s.market_id = m.id
				WHERE m.match_id IN (%s) AND m.sport = ?
				ORDER BY m.match_id,
				         CASE m.market_key
				             WHEN 'MATCH_RESULT_1X2' THEN 0
				             WHEN 'MATCH_RESULT_2WAY' THEN 0
				             WHEN 'TOTAL_GOALS' THEN 1
				             WHEN 'TOTAL_POINTS' THEN 1
				             ELSE 2
				         END,
				         CASE s.selection_key
				             WHEN 'HOME' THEN 0
				             WHEN 'DRAW' THEN 1
				             WHEN 'AWAY' THEN 2
				             WHEN 'OVER' THEN 3
				             WHEN 'UNDER' THEN 4
				             ELSE 5
				         END
				""".formatted(placeholders), (resultSet, rowNumber) -> mapMarketRow(resultSet),
				arguments.toArray());

		Map<String, Map<UUID, MarketBuilder>> grouped = new LinkedHashMap<>();
		for (MarketRow row : rows) {
			grouped.computeIfAbsent(row.matchId(), ignored -> new LinkedHashMap<>())
					.computeIfAbsent(row.id(), ignored -> new MarketBuilder(row))
					.selections().add(new FixtureSelection(row.selectionKey(), row.label(), row.probability(),
							row.odds()));
		}
		Map<String, List<FixtureMarket>> markets = new HashMap<>();
		grouped.forEach((matchId, builders) -> markets.put(matchId.substring(prefix.length()),
				builders.values().stream().map(MarketBuilder::build).toList()));
		return markets;
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

	private static MarketRow mapMarketRow(ResultSet resultSet) throws SQLException {
		return new MarketRow(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("match_id"),
				resultSet.getString("market_key"),
				resultSet.getString("title"),
				resultSet.getBigDecimal("line"),
				resultSet.getInt("version"),
				resultSet.getString("status"),
				resultSet.getString("selection_key"),
				resultSet.getString("label"),
				resultSet.getBigDecimal("probability"),
				resultSet.getBigDecimal("odds"));
	}

	private record MarketState(UUID id, String status, int version, BigDecimal line) {
	}

	private record MarketRow(UUID id, String matchId, String marketKey, String title, BigDecimal line, int version,
			String status, String selectionKey, String label, BigDecimal probability, BigDecimal odds) {
	}

	private static final class MarketBuilder {

		private final MarketRow row;
		private final List<FixtureSelection> selections = new ArrayList<>();

		private MarketBuilder(MarketRow row) {
			this.row = row;
		}

		private List<FixtureSelection> selections() {
			return selections;
		}

		private FixtureMarket build() {
			return new FixtureMarket(row.id().toString(), row.marketKey(), row.title(), row.line(), row.version(),
					row.status(), List.copyOf(selections));
		}
	}

}
