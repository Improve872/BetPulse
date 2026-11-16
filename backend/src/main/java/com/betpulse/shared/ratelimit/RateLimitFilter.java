package com.betpulse.shared.ratelimit;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Limita las rutas que mueven dinero o identidad. Se registra después del
 * filtro CSRF: una petición sin token válido ya se rechaza antes y no consume
 * cuota.
 */
@Component
public class RateLimitFilter extends OncePerRequestFilter {

	private static final Duration ONE_MINUTE = Duration.ofMinutes(1);

	private enum KeyType {
		IP, USER
	}

	private record Rule(String method, String pathPrefix, int limit, Duration window, KeyType keyType) {
	}

	private final RateLimiter limiter;
	private final RateLimitProperties properties;
	private final List<Rule> rules;

	public RateLimitFilter(RateLimiter limiter, RateLimitProperties properties) {
		this.limiter = limiter;
		this.properties = properties;
		this.rules = List.of(
				new Rule("POST", "/api/auth/login", properties.getLoginPerMinute(), ONE_MINUTE, KeyType.IP),
				new Rule("POST", "/api/auth/register", properties.getRegisterPerMinute(), ONE_MINUTE, KeyType.IP),
				new Rule("POST", "/api/auth/password", properties.getPasswordPerMinute(), ONE_MINUTE, KeyType.USER),
				new Rule("POST", "/api/bets", properties.getBetPerMinute(), ONE_MINUTE, KeyType.USER),
				new Rule("POST", "/api/wallet/deposits", properties.getWalletPerMinute(), ONE_MINUTE, KeyType.USER),
				new Rule("POST", "/api/wallet/withdrawals", properties.getWalletPerMinute(), ONE_MINUTE, KeyType.USER),
				new Rule("POST", "/api/admin", properties.getAdminPerMinute(), ONE_MINUTE, KeyType.USER),
				new Rule("DELETE", "/api/admin", properties.getAdminPerMinute(), ONE_MINUTE, KeyType.USER),
				new Rule("POST", "/internal/ingest", properties.getIngestPerMinute(), ONE_MINUTE, KeyType.IP));
	}

	@Override
	protected boolean shouldNotFilter(HttpServletRequest request) {
		return !properties.isEnabled() || findRule(request) == null;
	}

	@Override
	protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
			throws ServletException, IOException {
		Rule rule = findRule(request);
		String identity = rule.keyType() == KeyType.USER ? userIdentity(request) : clientIp(request);
		RateLimiter.Decision decision = limiter.check(
				rule.pathPrefix() + "|" + rule.keyType() + "|" + identity, rule.limit(), rule.window());

		if (!decision.allowed()) {
			response.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
			response.setHeader("Retry-After", Long.toString(decision.retryAfterSeconds()));
			response.setContentType(MediaType.APPLICATION_JSON_VALUE);
			response.setCharacterEncoding(StandardCharsets.UTF_8.name());
			response.getWriter().write(
					"{\"code\":\"RATE_LIMITED\",\"message\":\"Demasiadas solicitudes. Intenta de nuevo en un momento.\"}");
			return;
		}

		chain.doFilter(request, response);
	}

	private Rule findRule(HttpServletRequest request) {
		String method = request.getMethod();
		String uri = request.getRequestURI();
		for (Rule rule : rules) {
			if (rule.method().equals(method) && matches(uri, rule.pathPrefix())) {
				return rule;
			}
		}
		return null;
	}

	private static boolean matches(String uri, String prefix) {
		return uri.equals(prefix) || uri.startsWith(prefix + "/");
	}

	private static String clientIp(HttpServletRequest request) {
		String remote = request.getRemoteAddr();
		return remote == null || remote.isBlank() ? "unknown" : remote;
	}

	private static String userIdentity(HttpServletRequest request) {
		Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
		if (authentication != null && authentication.isAuthenticated()
				&& !"anonymousUser".equals(authentication.getName())) {
			return authentication.getName();
		}
		return "ip:" + clientIp(request);
	}

}
