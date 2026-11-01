package com.betpulse.collector;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.betpulse.collector.NormalizedBatch.Event;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

/**
 * Convierte payloads GSI en batches firmados: snapshot a 1 Hz y eventos
 * deduplicados. Los eventos críticos se reenvían de inmediato.
 */
public final class SnapshotPublisher {

	private static final int MAX_SEEN_EVENTS = 5000;

	private final GsiNormalizer normalizer;
	private final IngestForwarder forwarder;
	private final ObjectMapper objectMapper;
	private final UUID sessionId;
	private final long intervalMillis;
	private final Set<String> seenEvents = new LinkedHashSet<>();

	private Instant lastSnapshotAt = Instant.EPOCH;
	private long accepted;
	private long forwarded;
	private long ignored;

	public SnapshotPublisher(GsiNormalizer normalizer, IngestForwarder forwarder, ObjectMapper objectMapper,
			UUID sessionId, long intervalMillis) {
		this.normalizer = normalizer;
		this.forwarder = forwarder;
		this.objectMapper = objectMapper;
		this.sessionId = sessionId;
		this.intervalMillis = Math.max(100, intervalMillis);
	}

	public synchronized boolean accept(String raw, Instant now) {
		JsonNode root;
		try {
			root = objectMapper.readTree(raw);
		} catch (Exception exception) {
			ignored++;
			return false;
		}
		NormalizedBatch base = normalizer.normalize(root, sessionId, UUID.randomUUID(), now.toString());
		if (base == null) {
			ignored++;
			return false;
		}

		List<Event> fresh = new ArrayList<>();
		for (Event event : base.events()) {
			if (seenEvents.add(event.eventId())) {
				fresh.add(event);
			}
		}
		trimSeen();

		boolean due = Duration.between(lastSnapshotAt, now).toMillis() >= intervalMillis;
		boolean critical = fresh.stream().anyMatch(event -> isCritical(event.type()));
		if (!due && !critical && fresh.isEmpty()) {
			ignored++;
			return false;
		}

		lastSnapshotAt = now;
		accepted++;
		if (forwarder.forward(base.with(UUID.randomUUID(), fresh))) {
			forwarded++;
		}
		return true;
	}

	private void trimSeen() {
		Iterator<String> iterator = seenEvents.iterator();
		while (seenEvents.size() > MAX_SEEN_EVENTS && iterator.hasNext()) {
			iterator.next();
			iterator.remove();
		}
	}

	private static boolean isCritical(String type) {
		return "FIRST_BLOOD".equals(type) || "TOWER_KILL".equals(type) || "ROSHAN_KILL".equals(type)
				|| "PAUSE".equals(type) || "UNPAUSE".equals(type);
	}

	public UUID sessionId() {
		return sessionId;
	}

	public synchronized long accepted() {
		return accepted;
	}

	public synchronized long forwarded() {
		return forwarded;
	}

	public synchronized long ignored() {
		return ignored;
	}

}
