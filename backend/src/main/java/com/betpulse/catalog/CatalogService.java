package com.betpulse.catalog;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Comparator;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

import com.betpulse.catalog.LobbyDtos.FeedHealth;
import com.betpulse.catalog.LobbyDtos.LobbyMatch;
import com.betpulse.catalog.LobbyDtos.LobbyResponse;
import com.betpulse.catalog.LobbyDtos.LobbyTeam;
import com.betpulse.catalog.OpenDotaDtos.LiveMatch;
import com.betpulse.catalog.OpenDotaDtos.ProMatch;

@Service
public class CatalogService {

	private static final Logger log = LoggerFactory.getLogger(CatalogService.class);
	private static final int LIVE_LIMIT = 6;
	private static final int RECENT_LIMIT = 8;

	private final OpenDotaClient openDotaClient;
	private final ApplicationEventPublisher eventPublisher;
	private final OpenDotaProperties properties;
	private final Clock clock;
	private final Object refreshLock = new Object();

	private volatile LobbySnapshot snapshot;
	private volatile Instant lastSuccessAt;
	private volatile Instant lastAttemptAt;
	private volatile Instant nextAttemptAt;
	private volatile int consecutiveFailures;
	private volatile String lastError;

	public CatalogService(OpenDotaClient openDotaClient, ApplicationEventPublisher eventPublisher,
			OpenDotaProperties properties, Clock clock) {
		this.openDotaClient = openDotaClient;
		this.eventPublisher = eventPublisher;
		this.properties = properties;
		this.clock = clock;
	}

	public LobbyResponse getLobby() {
		return currentResponse();
	}

	public void refreshIfDue() {
		Instant now = clock.instant();
		Instant next = nextAttemptAt;
		if (next != null && now.isBefore(next)) {
			return;
		}
		refresh();
	}

	public void refresh() {
		synchronized (refreshLock) {
			Instant now = clock.instant();
			lastAttemptAt = now;
			try {
				List<LiveMatch> liveRaw = openDotaClient.fetchLiveMatches();
				List<ProMatch> proRaw = openDotaClient.fetchProMatches();
				Instant successAt = clock.instant();

				snapshot = new LobbySnapshot(mapLive(liveRaw), mapRecent(proRaw), successAt);
				lastSuccessAt = successAt;
				consecutiveFailures = 0;
				lastError = null;
				nextAttemptAt = successAt.plus(properties.getPollInterval());

				log.info("OpenDota catalog refreshed: {} live, {} recent", snapshot.live().size(),
						snapshot.recent().size());
			} catch (RuntimeException exception) {
				consecutiveFailures++;
				lastError = sanitize(exception);
				nextAttemptAt = clock.instant().plus(backoff(consecutiveFailures));
				log.warn("OpenDota catalog refresh failed (attempt {}): {}", consecutiveFailures, lastError);
			}
			eventPublisher.publishEvent(new CatalogUpdatedEvent(currentResponse()));
		}
	}

	private LobbyResponse currentResponse() {
		Instant now = clock.instant();
		LobbySnapshot current = snapshot;
		return new LobbyResponse(
				current == null ? List.of() : current.live(),
				current == null ? List.of() : current.recent(),
				current == null ? now : current.updatedAt(),
				feedHealth(now));
	}

	private FeedHealth feedHealth(Instant now) {
		boolean stale = lastSuccessAt == null
				|| now.isAfter(lastSuccessAt.plus(properties.getStaleAfter()));
		String status;
		if (lastSuccessAt == null) {
			status = consecutiveFailures > 0 ? "DOWN" : "STARTING";
		} else if (stale) {
			status = "STALE";
		} else if (consecutiveFailures > 0) {
			status = "DEGRADED";
		} else {
			status = "LIVE";
		}
		return new FeedHealth("OPENDOTA", status, lastSuccessAt, lastAttemptAt, nextAttemptAt,
				consecutiveFailures, lastError, stale);
	}

	private List<LobbyMatch> mapLive(List<LiveMatch> matches) {
		return matches.stream()
				.filter(match -> match.matchId() != null)
				.filter(match -> Boolean.TRUE.equals(match.watchEligible()))
				.filter(match -> value(match.gameTime()) > 0)
				.filter(match -> value(match.deactivateTime()) == 0)
				.sorted(Comparator
						.comparingInt((LiveMatch match) -> value(match.spectators())).reversed()
						.thenComparing(Comparator
								.comparingInt((LiveMatch match) -> value(match.averageMmr())).reversed()))
				.limit(LIVE_LIMIT)
				.map(this::toLiveMatch)
				.toList();
	}

	private List<LobbyMatch> mapRecent(List<ProMatch> matches) {
		return matches.stream()
				.filter(match -> match.matchId() != null)
				.filter(match -> hasText(match.radiantName()) && hasText(match.direName()))
				.sorted(Comparator.comparingLong((ProMatch match) -> value(match.startTime())).reversed())
				.limit(RECENT_LIMIT)
				.map(this::toRecentMatch)
				.toList();
	}

	private LobbyMatch toLiveMatch(LiveMatch match) {
		String radiantName = hasText(match.teamNameRadiant()) ? match.teamNameRadiant().trim() : "Radiant";
		String direName = hasText(match.teamNameDire()) ? match.teamNameDire().trim() : "Dire";
		int delay = value(match.delay());

		return new LobbyMatch(
				String.valueOf(match.matchId()),
				"dota2",
				"live",
				"",
				value(match.leagueId()) > 0 ? "pro" : "ranked",
				"",
				value(match.activateTime()),
				value(match.gameTime()),
				new LobbyTeam(radiantName, value(match.radiantScore()), "radiant", null),
				new LobbyTeam(direName, value(match.direScore()), "dire", null),
				positiveOrNull(match.averageMmr()),
				positiveOrNull(match.spectators()),
				delay > 0 ? delay : null);
	}

	private LobbyMatch toRecentMatch(ProMatch match) {
		boolean radiantWinner = Boolean.TRUE.equals(match.radiantWin());
		return new LobbyMatch(
				String.valueOf(match.matchId()),
				"dota2",
				"finished",
				hasText(match.leagueName()) ? match.leagueName().trim() : "",
				"pro",
				seriesFormat(value(match.seriesType())),
				value(match.startTime()),
				value(match.duration()),
				new LobbyTeam(match.radiantName().trim(), value(match.radiantScore()), "radiant", radiantWinner),
				new LobbyTeam(match.direName().trim(), value(match.direScore()), "dire", !radiantWinner),
				null,
				null,
				null);
	}

	private Duration backoff(int failures) {
		long multiplier = 1L << Math.min(Math.max(failures - 1, 0), 10);
		Duration delay = properties.getBackoffBase().multipliedBy(multiplier);
		return delay.compareTo(properties.getBackoffMax()) > 0 ? properties.getBackoffMax() : delay;
	}

	private static String sanitize(RuntimeException exception) {
		String message = exception.getMessage();
		if (message == null || message.isBlank()) {
			return exception.getClass().getSimpleName();
		}
		return message.length() > 300 ? message.substring(0, 300) : message;
	}

	private static int value(Number number) {
		return number == null ? 0 : number.intValue();
	}

	private static Integer positiveOrNull(Integer number) {
		return number == null || number <= 0 ? null : number;
	}

	private static boolean hasText(String value) {
		return value != null && !value.isBlank();
	}

	private static String seriesFormat(int seriesType) {
		return switch (seriesType) {
			case 0 -> "BO1";
			case 1 -> "BO3";
			case 2 -> "BO5";
			default -> "";
		};
	}

	private record LobbySnapshot(List<LobbyMatch> live, List<LobbyMatch> recent, Instant updatedAt) {
	}

}
