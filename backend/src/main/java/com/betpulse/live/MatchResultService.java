package com.betpulse.live;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.betpulse.catalog.OpenDotaClient;
import com.betpulse.catalog.OpenDotaDtos.MatchDetails;
import com.betpulse.catalog.OpenDotaProperties;
import com.betpulse.live.MatchResultStore.PendingResult;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Cierra el ciclo de datos de una partida: cuando los mercados de un partido
 * quedan cerrados, consulta OpenDota hasta obtener el resultado final y lo
 * persiste. La liquidación de apuestas (M5) consumirá este resultado ya
 * resuelto, sin volver a consultar la fuente.
 */
@Service
public class MatchResultService {

	private static final Logger log = LoggerFactory.getLogger(MatchResultService.class);
	private static final int BATCH_SIZE = 10;
	private static final long RETRY_BASE_SECONDS = 60;
	private static final long RETRY_MAX_SECONDS = 1800;

	private final MatchResultStore store;
	private final OpenDotaClient openDotaClient;
	private final ObjectMapper objectMapper;
	private final OpenDotaProperties properties;
	private final Clock clock;

	public MatchResultService(MatchResultStore store, OpenDotaClient openDotaClient, ObjectMapper objectMapper,
			OpenDotaProperties properties, Clock clock) {
		this.store = store;
		this.openDotaClient = openDotaClient;
		this.objectMapper = objectMapper;
		this.properties = properties;
		this.clock = clock;
	}

	public void runOnce() {
		int enqueued = store.enqueueClosedMatchesWithoutResult();
		if (enqueued > 0) {
			log.info("Resultados pendientes encolados: {}", enqueued);
		}
		processPending();
	}

	public void processPending() {
		List<PendingResult> pending = store.findPending(clock.instant(), BATCH_SIZE);
		for (PendingResult result : pending) {
			resolve(result);
		}
	}

	public void resolveNow(String matchId) {
		store.find(matchId)
				.filter(row -> "PENDING".equals(row.status()))
				.ifPresent(row -> resolve(new PendingResult(matchId, row.attempts())));
	}

	private void resolve(PendingResult pending) {
		long matchId;
		try {
			matchId = Long.parseLong(pending.matchId());
		} catch (NumberFormatException exception) {
			store.markFailure(pending.matchId(), "match_id no numérico: " + pending.matchId(),
					clock.instant(), true, clock.instant());
			return;
		}

		try {
			MatchDetails details = openDotaClient.fetchMatch(matchId);
			if (isFinished(details)) {
				store.markReady(pending.matchId(), details, objectivesJson(details), clock.instant());
				log.info("Resultado final guardado para {}: {}-{}, ganador {}, duración {} s",
						pending.matchId(), details.radiantScore(), details.direScore(),
						Boolean.TRUE.equals(details.radiantWin()) ? "RADIANT" : "DIRE", details.duration());
				return;
			}
			retry(pending, "OpenDota aún no tiene el resultado final");
		} catch (RuntimeException exception) {
			retry(pending, exception.getMessage());
		}
	}

	private void retry(PendingResult pending, String error) {
		int attempt = pending.attempts() + 1;
		boolean terminal = attempt >= Math.max(properties.getResultMaxAttempts(), 1);
		Instant now = clock.instant();
		long delaySeconds = Math.min(RETRY_BASE_SECONDS * attempt, RETRY_MAX_SECONDS);
		Instant nextAttempt = now.plus(Duration.ofSeconds(delaySeconds));
		store.markFailure(pending.matchId(), error, nextAttempt, terminal, now);
		if (terminal) {
			log.warn("Resultado de {} marcado FAILED tras {} intentos: {}", pending.matchId(), attempt, error);
		} else {
			log.debug("Resultado de {} se reintentará en {} s: {}", pending.matchId(), delaySeconds, error);
		}
	}

	private static boolean isFinished(MatchDetails details) {
		return details != null && details.radiantWin() != null
				&& details.duration() != null && details.duration() > 0;
	}

	private String objectivesJson(MatchDetails details) {
		try {
			return objectMapper.writeValueAsString(details.objectives() == null ? List.of() : details.objectives());
		} catch (JsonProcessingException exception) {
			log.warn("No se pudieron serializar los objetivos de {}: {}", details.matchId(), exception.getMessage());
			return "[]";
		}
	}

}
