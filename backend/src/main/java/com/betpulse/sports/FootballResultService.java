package com.betpulse.sports;

import java.sql.Timestamp;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

import com.betpulse.sports.EspnScoreboardDtos.Competition;
import com.betpulse.sports.EspnScoreboardDtos.Competitor;
import com.betpulse.sports.EspnScoreboardDtos.Event;
import com.betpulse.sports.EspnScoreboardDtos.Scoreboard;
import com.betpulse.sports.EspnScoreboardDtos.Status;

/**
 * Ingesta el resultado final de los partidos de fútbol desde ESPN. Solo
 * escribe en {@code sport_results}; la resolución de mercados y el settlement
 * siguen siendo agnósticos a la fuente.
 */
@Service
public class FootballResultService {

	private static final Logger log = LoggerFactory.getLogger(FootballResultService.class);
	private static final int BATCH_SIZE = 40;

	private final JdbcTemplate jdbcTemplate;
	private final EspnScoreboardClient client;
	private final FootballProperties properties;
	private final Clock clock;

	public FootballResultService(JdbcTemplate jdbcTemplate, EspnScoreboardClient client,
			FootballProperties properties, Clock clock) {
		this.jdbcTemplate = jdbcTemplate;
		this.client = client;
		this.properties = properties;
		this.clock = clock;
	}

	public int pollOnce() {
		Instant now = clock.instant();
		List<PendingFixture> pending = jdbcTemplate.query("""
				SELECT match_id, league_slug, event_id, kickoff_at
				FROM sport_results
				WHERE status = 'PENDING' AND kickoff_at <= ?
				ORDER BY kickoff_at
				LIMIT ?
				""", (resultSet, rowNumber) -> new PendingFixture(
				resultSet.getString("match_id"),
				resultSet.getString("league_slug"),
				resultSet.getString("event_id"),
				resultSet.getTimestamp("kickoff_at").toInstant()), Timestamp.from(now), BATCH_SIZE);
		if (pending.isEmpty()) {
			return 0;
		}

		Map<String, Scoreboard> boards = new HashMap<>();
		int updated = 0;
		for (PendingFixture fixture : pending) {
			LocalDate date = LocalDate.ofInstant(fixture.kickoff(), ZoneOffset.UTC);
			Event event = findEvent(board(boards, fixture.league(), date), fixture.eventId());
			if (event == null) {
				// ESPN agrupa por fecha local; un partido nocturno en UTC puede
				// aparecer en el scoreboard del día anterior.
				event = findEvent(board(boards, fixture.league(), date.minusDays(1)), fixture.eventId());
			}
			if (apply(fixture, event, now)) {
				updated++;
			}
		}
		return updated;
	}

	private Scoreboard board(Map<String, Scoreboard> boards, String league, LocalDate date) {
		String key = league + "|" + date;
		if (boards.containsKey(key)) {
			return boards.get(key);
		}
		Scoreboard board = fetchBoard(league, date);
		boards.put(key, board);
		return board;
	}

	private static Event findEvent(Scoreboard board, String eventId) {
		if (board == null || board.events() == null) {
			return null;
		}
		return board.events().stream()
				.filter(candidate -> eventId.equals(candidate.id()))
				.findFirst()
				.orElse(null);
	}

	private Scoreboard fetchBoard(String league, LocalDate date) {
		try {
			return client.fetch(league, date);
		} catch (RuntimeException exception) {
			log.warn("No se pudo consultar el resultado de {} el {}: {}", league, date, exception.getMessage());
			return null;
		}
	}

	private boolean apply(PendingFixture fixture, Event event, Instant now) {
		if (event != null && event.competitions() != null && !event.competitions().isEmpty()) {
			Competition competition = event.competitions().get(0);
			Status status = competition.status() != null ? competition.status() : event.status();
			if (isFinal(status)) {
				return saveFinal(fixture, competition);
			}
			if (isAbandoned(status)) {
				return saveVoid(fixture, statusName(status));
			}
		}

		Duration elapsed = Duration.between(fixture.kickoff(), now);
		if (elapsed.compareTo(properties.getResultVoidAfter()) > 0) {
			return saveVoid(fixture, "Sin resultado de ESPN en "
					+ properties.getResultVoidAfter().toHours() + " h");
		}
		jdbcTemplate.update("""
				UPDATE sport_results
				SET attempts = attempts + 1, last_attempt_at = now(), updated_at = now()
				WHERE match_id = ?
				""", fixture.matchId());
		return false;
	}

	private boolean saveFinal(PendingFixture fixture, Competition competition) {
		Competitor home = find(competition, "home");
		Competitor away = find(competition, "away");
		Integer homeScore = home == null ? null : parseScore(home.score());
		Integer awayScore = away == null ? null : parseScore(away.score());
		if (homeScore == null || awayScore == null) {
			jdbcTemplate.update("""
					UPDATE sport_results
					SET attempts = attempts + 1, last_attempt_at = now(), updated_at = now()
					WHERE match_id = ?
					""", fixture.matchId());
			return false;
		}
		String winner = homeScore > awayScore ? "HOME" : homeScore.equals(awayScore) ? "DRAW" : "AWAY";
		int rows = jdbcTemplate.update("""
				UPDATE sport_results
				SET status = 'READY', home_score = ?, away_score = ?, winner = ?, detail = 'FT',
				    attempts = attempts + 1, last_attempt_at = now(), resolved_at = now(), updated_at = now()
				WHERE match_id = ? AND status = 'PENDING'
				""", homeScore, awayScore, winner, fixture.matchId());
		if (rows > 0) {
			log.info("Resultado de fútbol {}: {}-{} ({})", fixture.matchId(), homeScore, awayScore, winner);
		}
		return rows > 0;
	}

	private boolean saveVoid(PendingFixture fixture, String detail) {
		int rows = jdbcTemplate.update("""
				UPDATE sport_results
				SET status = 'VOID', detail = ?, attempts = attempts + 1, last_attempt_at = now(),
				    resolved_at = now(), updated_at = now()
				WHERE match_id = ? AND status = 'PENDING'
				""", truncate(detail), fixture.matchId());
		if (rows > 0) {
			log.info("Partido de fútbol {} anulado: {}", fixture.matchId(), detail);
		}
		return rows > 0;
	}

	private static boolean isFinal(Status status) {
		return status != null && status.type() != null
				&& ("post".equals(status.type().state()) || Boolean.TRUE.equals(status.type().completed()));
	}

	private static boolean isAbandoned(Status status) {
		if (status == null || status.type() == null) {
			return false;
		}
		String name = statusName(status);
		return name.contains("POSTPONED") || name.contains("CANCELED") || name.contains("CANCELLED")
				|| name.contains("ABANDONED");
	}

	private static String statusName(Status status) {
		if (status == null || status.type() == null) {
			return "";
		}
		String name = status.type().name();
		if (name != null && !name.isBlank()) {
			return name;
		}
		return status.type().detail() == null ? "" : status.type().detail().toUpperCase();
	}

	private static Competitor find(Competition competition, String side) {
		if (competition.competitors() == null) {
			return null;
		}
		return competition.competitors().stream()
				.filter(competitor -> side.equals(competitor.homeAway()))
				.findFirst()
				.orElse(null);
	}

	private static Integer parseScore(String value) {
		try {
			return value == null || value.isBlank() ? null : Integer.valueOf(value);
		} catch (NumberFormatException exception) {
			return null;
		}
	}

	private static String truncate(String value) {
		if (value == null) {
			return null;
		}
		return value.length() <= 120 ? value : value.substring(0, 120);
	}

	private record PendingFixture(String matchId, String league, String eventId, Instant kickoff) {
	}

}
