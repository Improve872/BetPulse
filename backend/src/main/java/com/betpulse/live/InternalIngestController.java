package com.betpulse.live;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RestController;

import com.betpulse.live.IngestDtos.Batch;
import com.betpulse.live.IngestDtos.Result;
import com.betpulse.shared.error.ApiException;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

@RestController
public class InternalIngestController {

	private final IngestSignature ingestSignature;
	private final IngestService ingestService;
	private final ObjectMapper objectMapper;

	public InternalIngestController(IngestSignature ingestSignature, IngestService ingestService,
			ObjectMapper objectMapper) {
		this.ingestSignature = ingestSignature;
		this.ingestService = ingestService;
		this.objectMapper = objectMapper;
	}

	@PostMapping("/internal/ingest")
	public ResponseEntity<Result> ingest(@RequestBody String body,
			@RequestHeader(value = "X-BetPulse-Timestamp", required = false) String timestamp,
			@RequestHeader(value = "X-BetPulse-Signature", required = false) String signature) {
		if (!ingestSignature.isValid(timestamp, signature, body)) {
			throw ApiException.unauthorized("Firma HMAC de ingest inválida.");
		}
		Batch batch;
		try {
			batch = objectMapper.readValue(body, Batch.class);
		} catch (JsonProcessingException exception) {
			throw ApiException.badRequest("INVALID_INGEST", "JSON de ingest inválido.");
		}
		return ResponseEntity.status(HttpStatus.ACCEPTED).body(ingestService.ingest(batch));
	}

}
