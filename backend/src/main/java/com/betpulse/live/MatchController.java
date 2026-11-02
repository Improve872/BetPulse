package com.betpulse.live;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import com.betpulse.live.MatchDetailDtos.MatchDetail;
import com.betpulse.shared.error.ApiException;

@RestController
@RequestMapping("/api/matches")
public class MatchController {

	private final MatchDetailService matchDetailService;
	private final MatchStreamService matchStreamService;

	public MatchController(MatchDetailService matchDetailService, MatchStreamService matchStreamService) {
		this.matchDetailService = matchDetailService;
		this.matchStreamService = matchStreamService;
	}

	@GetMapping("/{matchId}")
	public MatchDetail detail(@PathVariable String matchId) {
		return matchDetailService.find(matchId)
				.orElseThrow(() -> ApiException.notFound("MATCH_NOT_FOUND", "La partida no está disponible."));
	}

	@GetMapping(value = "/{matchId}/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
	public SseEmitter stream(@PathVariable String matchId) {
		MatchDetail initial = matchDetailService.find(matchId)
				.orElseThrow(() -> ApiException.notFound("MATCH_NOT_FOUND", "La partida no está disponible."));
		return matchStreamService.subscribe(matchId, initial);
	}

}
