package com.betpulse.sports;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.markets.BasketballMarketKind;
import com.betpulse.markets.BasketballOddsModel;
import com.betpulse.markets.OddsEngine.Quote;
import com.betpulse.markets.PrematchMarketPublisher;
import com.betpulse.markets.TeamStrength;
import com.betpulse.sports.BasketballStrengthService.LeagueStrength;
import com.betpulse.sports.SportsDtos.FixtureView;
import com.betpulse.sports.SportsDtos.FixturesResponse;
import com.betpulse.sports.SportsDtos.LeagueFixtures;

/**
 * Publica y mantiene los mercados pre-partida de NBA: ganador sin empate y
 * total de puntos. Se cierran en el kickoff y no se reabren.
 */
@Service
public class BasketballMarketService {

	private static final Logger log = LoggerFactory.getLogger(BasketballMarketService.class);

	public static final String MATCH_PREFIX = "BB:";
	private static final String BASKETBALL = "BASKETBALL";
	private static final String SOURCE = "BASKETBALL_PREMATCH";
	private static final String READY = "READY";
	private static final String VOID = "VOID";

	private final PrematchMarketPublisher publisher;
	private final BasketballOddsModel model;
	private final BasketballStrengthService strengthService;
	private final BasketballProperties properties;
	private final Clock clock;

	public BasketballMarketService(PrematchMarketPublisher publisher, BasketballOddsModel model,
			BasketballStrengthService strengthService, BasketballProperties properties, Clock clock) {
		this.publisher = publisher;
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
					log.warn("No se pudieron publicar mercados de NBA para {}: {}", fixture.id(),
							exception.getMessage());
				}
			}
		}
		publisher.closeStarted(BASKETBALL);
	}

	public FixturesResponse withMarkets(FixturesResponse response) {
		return publisher.attachMarkets(response, BASKETBALL, MATCH_PREFIX);
	}

	private void syncFixture(String leagueSlug, FixtureView fixture) {
		String matchId = MATCH_PREFIX + fixture.id();
		String resultStatus = publisher.resultStatus(matchId);
		if (READY.equals(resultStatus) || VOID.equals(resultStatus)) {
			publisher.closeMarkets(matchId);
			return;
		}
		publisher.registerResult(matchId, BASKETBALL, leagueSlug, fixture.id(), fixture.kickoff());

		LeagueStrength league = strengthService.strength(leagueSlug);
		TeamStrength home = strengthService.team(league, fixture.home().id());
		TeamStrength away = strengthService.team(league, fixture.away().id());
		double[] expected = BasketballOddsModel.expectedPoints(home, away, league.averagePerTeam(),
				properties.getHomeAdvantage());

		for (BasketballMarketKind kind : BasketballMarketKind.values()) {
			BigDecimal line = kind.lineRequired() ? model.totalLine(expected[0], expected[1]) : null;
			List<Quote> quotes = model.quotes(kind, line, expected[0], expected[1]);
			publisher.publish(matchId, BASKETBALL, kind.name(), kind.title(), line, quotes, SOURCE,
					selectionKey -> label(selectionKey, line, fixture));
		}
	}

	private static String label(String selectionKey, BigDecimal line, FixtureView fixture) {
		return switch (selectionKey) {
			case "HOME" -> fixture.home().name();
			case "AWAY" -> fixture.away().name();
			case "OVER" -> "Más de " + lineValue(line);
			case "UNDER" -> "Menos de " + lineValue(line);
			default -> selectionKey;
		};
	}

	private static String lineValue(BigDecimal line) {
		return line == null ? "" : line.stripTrailingZeros().toPlainString();
	}

}
