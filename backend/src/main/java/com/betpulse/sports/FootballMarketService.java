package com.betpulse.sports;

import java.math.BigDecimal;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.Clock;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.markets.FootballMarketKind;
import com.betpulse.markets.FootballOddsModel;
import com.betpulse.markets.FootballOddsModel.TeamStrength;
import com.betpulse.markets.OddsEngine.Quote;
import com.betpulse.sports.FootballStrengthService.LeagueStrength;
import com.betpulse.sports.SportsDtos.FixtureMarket;
import com.betpulse.sports.SportsDtos.FixtureSelection;
import com.betpulse.sports.SportsDtos.FixtureView;
import com.betpulse.sports.SportsDtos.FixturesResponse;
import com.betpulse.sports.SportsDtos.LeagueFixtures;

/**
 * Publica y mantiene los mercados pre-partida de fútbol. Las cuotas salen del
 * modelo Poisson sobre la tabla real de ESPN; los mercados se cierran en el
 * kickoff y nunca se reabren.
 */
@Service
public class FootballMarketService {

	private static final Logger log = LoggerFactory.getLogger(FootballMarketService.class);

	public static final String MATCH_PREFIX = "FB:";
	private static final String SOCCER = "SOCCER";
	private static final String ESPN = "ESPN";
	private static final String SOURCE = "POISSON_PREMATCH";
	private static final String OPEN = "OPEN";
	private static final String CLOSED = "CLOSED";
	private static final String SETTLED = "SETTLED";
	private static final String VOID = "VOID";

	private final JdbcTemplate jdbcTemplate;
	private final FootballOddsModel model;
	private final FootballStrengthService strengthService;
	private final FootballProperties properties;
	private final Clock clock;

	public FootballMarketService(JdbcTemplate jdbcTemplate, FootballOddsModel model,
			FootballStrengthService strengthService, FootballProperties properties, Clock clock) {
		this.jdbcTemplate = jdbcTemplate;
		this.model = model;
		this.strengthService = strengthService;
		this.properties = properties;
		this.clock = clock;
	}

	@Transactional
	public void sync(FixturesResponse response) {
		Instant now = clock.instant();
		for (LeagueFixtures league : response.leagues()) {
			for (FixtureView fixture : league.fixtures()) {
				if (!"SCHEDULED".equals(fixture.state()) || !fixture.kickoff().isAfter(now)) {
					continue;
				}
				try {
					syncFixture(league.id(), fixture);
				} catch (RuntimeException exception) {
					log.warn("No se pudieron publicar mercados para {}: {}", fixture.id(), exception.getMessage());
				}
			}
		}
		closeStarted();
	}

	/** Devuelve los fixtures con sus mercados ya publicados. */
	public FixturesResponse withMarkets(FixturesResponse response) {
		List<String> matchIds = new ArrayList<>();
		for (LeagueFixtures league : response.leagues()) {
			for (FixtureView fixture : league.fixtures()) {
				matchIds.add(matchId(fixture.id()));
			}
		}
		if (matchIds.isEmpty()) {
			return response;
		}
		Map<String, List<FixtureMarket>> markets = loadMarkets(matchIds);
		List<LeagueFixtures> leagues = response.leagues().stream()
				.map(league -> new LeagueFixtures(league.id(), league.name(), league.fixtures().stream()
						.map(fixture -> fixture.withMarkets(
								markets.getOrDefault(matchId(fixture.id()), List.of())))
						.toList()))
				.toList();
		return new FixturesResponse(response.sport(), response.updatedAt(), response.status(),
				response.lastSuccessAt(), response.lastError(), leagues);
	}

	private void syncFixture(String leagueSlug, FixtureView fixture) {
		String matchId = matchId(fixture.id());
		String resultStatus = resultStatus(matchId);
		if ("READY".equals(resultStatus) || VOID.equals(resultStatus)) {
			closeMarkets(matchId);
			return;
		}
		registerResultRow(matchId, leagueSlug, fixture);

		LeagueStrength league = strengthService.strength(leagueSlug);
		TeamStrength home = strengthService.team(league, fixture.home().id());
		TeamStrength away = strengthService.team(league, fixture.away().id());
		double[] expected = FootballOddsModel.expectedGoals(home, away, league.averagePerTeam(),
				properties.getHomeAdvantage());

		for (FootballMarketKind kind : FootballMarketKind.values()) {
			syncMarket(matchId, kind, expected, fixture);
		}
	}

	private void registerResultRow(String matchId, String leagueSlug, FixtureView fixture) {
		jdbcTemplate.update("""
				INSERT INTO sport_results (match_id, sport, league_slug, event_id, kickoff_at)
				VALUES (?, ?, ?, ?, ?)
				ON CONFLICT (match_id) DO NOTHING
				""", matchId, SOCCER, leagueSlug, fixture.id(), Timestamp.from(fixture.kickoff()));
	}

	private void syncMarket(String matchId, FootballMarketKind kind, double[] expected, FixtureView fixture) {
		MarketState market = findMarket(matchId, kind);
		if (market == null) {
			BigDecimal line = kind.lineRequired() ? model.totalLine(expected[0], expected[1]) : null;
			jdbcTemplate.update("""
					INSERT INTO markets (match_id, market_key, market_type, title, line, status, source, practice,
					    sport, opened_at)
					VALUES (?, ?, ?, ?, CAST(? AS NUMERIC), ?, ?, false, ?, now())
					ON CONFLICT (match_id, market_key) DO NOTHING
					""", matchId, kind.name(), kind.name(), kind.title(), line, OPEN, ESPN, SOCCER);
			market = findMarket(matchId, kind);
		}
		if (market == null || SETTLED.equals(market.status()) || VOID.equals(market.status())
				|| CLOSED.equals(market.status())) {
			return;
		}

		List<Quote> quotes = model.quotes(kind, market.line(), expected[0], expected[1]);
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
					""", market.id(), quote.selectionKey(), label(kind, quote.selectionKey(), market.line(), fixture),
					quote.probability(), quote.odds());
			if (changed) {
				jdbcTemplate.update("""
						INSERT INTO odds_history (market_id, version, selection_key, probability, odds, source)
						VALUES (?, ?, ?, ?, ?, ?)
						""", market.id(), nextVersion, quote.selectionKey(), quote.probability(), quote.odds(), SOURCE);
			}
		}
	}

	private void closeStarted() {
		int closed = jdbcTemplate.update("""
				UPDATE markets m
				SET status = ?, suspension_reason = NULL, suspended_at = NULL,
				    closed_at = COALESCE(m.closed_at, now()), updated_at = now()
				FROM sport_results r
				WHERE r.match_id = m.match_id AND m.sport = ? AND r.kickoff_at <= now()
				  AND m.status IN (?, 'SUSPENDED')
				""", CLOSED, SOCCER, OPEN);
		if (closed > 0) {
			log.info("Mercados de fútbol cerrados por inicio de partido: {}", closed);
		}
	}

	private void closeMarkets(String matchId) {
		jdbcTemplate.update("""
				UPDATE markets
				SET status = ?, suspension_reason = NULL, suspended_at = NULL,
				    closed_at = COALESCE(closed_at, now()), updated_at = now()
				WHERE match_id = ? AND status IN (?, 'SUSPENDED')
				""", CLOSED, matchId, OPEN);
	}

	private MarketState findMarket(String matchId, FootballMarketKind kind) {
		List<MarketState> rows = jdbcTemplate.query("""
				SELECT id, status, version, line
				FROM markets
				WHERE match_id = ? AND market_key = ?
				""", (resultSet, rowNumber) -> new MarketState(
				resultSet.getObject("id", UUID.class),
				resultSet.getString("status"),
				resultSet.getInt("version"),
				resultSet.getBigDecimal("line")), matchId, kind.name());
		return rows.stream().findFirst().orElse(null);
	}

	private String resultStatus(String matchId) {
		List<String> rows = jdbcTemplate.queryForList(
				"SELECT status FROM sport_results WHERE match_id = ?", String.class, matchId);
		return rows.isEmpty() ? null : rows.get(0);
	}

	private Map<String, List<FixtureMarket>> loadMarkets(List<String> matchIds) {
		String placeholders = matchIds.stream().map(ignored -> "?").collect(Collectors.joining(", "));
		List<Object> arguments = new ArrayList<>(matchIds);
		List<MarketRow> rows = jdbcTemplate.query("""
				SELECT m.id, m.match_id, m.market_key, m.title, m.line, m.version, m.status,
				       s.selection_key, s.label, s.probability, s.odds
				FROM markets m
				JOIN selections s ON s.market_id = m.id
				WHERE m.match_id IN (%s) AND m.sport = ?
				ORDER BY m.match_id,
				         CASE m.market_key WHEN 'MATCH_RESULT_1X2' THEN 0 ELSE 1 END,
				         CASE s.selection_key
				             WHEN 'HOME' THEN 0 WHEN 'DRAW' THEN 1 WHEN 'AWAY' THEN 2
				             WHEN 'OVER' THEN 0 ELSE 1 END
				""".formatted(placeholders), (resultSet, rowNumber) -> mapMarketRow(resultSet),
				append(arguments, SOCCER));

		Map<String, Map<UUID, MarketBuilder>> grouped = new LinkedHashMap<>();
		for (MarketRow row : rows) {
			grouped.computeIfAbsent(row.matchId(), ignored -> new LinkedHashMap<>())
					.computeIfAbsent(row.id(), ignored -> new MarketBuilder(row))
					.selections().add(new FixtureSelection(row.selectionKey(), row.label(), row.probability(),
							row.odds()));
		}
		Map<String, List<FixtureMarket>> markets = new HashMap<>();
		grouped.forEach((matchId, builders) -> markets.put(matchId,
				builders.values().stream().map(MarketBuilder::build).toList()));
		return markets;
	}

	private static Object[] append(List<Object> values, Object extra) {
		List<Object> copy = new ArrayList<>(values);
		copy.add(extra);
		return copy.toArray();
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

	private static String label(FootballMarketKind kind, String selectionKey, BigDecimal line, FixtureView fixture) {
		return switch (selectionKey) {
			case "HOME" -> fixture.home().name();
			case "DRAW" -> "Empate";
			case "AWAY" -> fixture.away().name();
			case "OVER" -> "Más de " + lineValue(line);
			case "UNDER" -> "Menos de " + lineValue(line);
			default -> selectionKey;
		};
	}

	private static String lineValue(BigDecimal line) {
		return line == null ? "" : line.stripTrailingZeros().toPlainString();
	}

	private static String matchId(String eventId) {
		return MATCH_PREFIX + eventId;
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
