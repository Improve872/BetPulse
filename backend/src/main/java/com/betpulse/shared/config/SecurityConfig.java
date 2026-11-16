package com.betpulse.shared.config;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;

import com.betpulse.shared.ratelimit.RateLimitFilter;

import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

	@Bean
	public SecurityContextRepository securityContextRepository() {
		return new HttpSessionSecurityContextRepository();
	}

	/**
	 * El filtro solo debe ejecutarse dentro de la cadena de seguridad, después
	 * de CSRF y con el contexto ya cargado. Sin esto, Spring Boot lo registra
	 * además como filtro de servlet y correría antes, perdiendo la identidad
	 * del usuario y saltándose CSRF.
	 */
	@Bean
	FilterRegistrationBean<RateLimitFilter> rateLimitFilterRegistration(RateLimitFilter rateLimitFilter) {
		FilterRegistrationBean<RateLimitFilter> registration = new FilterRegistrationBean<>(rateLimitFilter);
		registration.setEnabled(false);
		return registration;
	}

	@Bean
	SecurityFilterChain securityFilterChain(HttpSecurity http, SecurityContextRepository securityContextRepository,
			RateLimitFilter rateLimitFilter)
			throws Exception {
		return http
				.csrf(csrf -> csrf
						.csrfTokenRepository(new HttpSessionCsrfTokenRepository())
						.ignoringRequestMatchers("/api/health", "/actuator/health", "/internal/**"))
				.securityContext(context -> context.securityContextRepository(securityContextRepository))
				.sessionManagement(session -> session.sessionFixation(fixation -> fixation.migrateSession()))
				.addFilterAfter(rateLimitFilter, CsrfFilter.class)
				.authorizeHttpRequests(auth -> auth
						.requestMatchers("/api/health", "/actuator/health", "/api/auth/csrf", "/api/auth/login",
								"/api/auth/register", "/api/catalog/**", "/api/live/**", "/api/markets/**",
								"/api/matches/**", "/internal/**")
						.permitAll()
						.anyRequest().authenticated())
				.exceptionHandling(exceptions -> exceptions
						.authenticationEntryPoint((request, response, exception) -> writeError(response,
								HttpStatus.UNAUTHORIZED.value(), "UNAUTHENTICATED", "Autenticación requerida."))
						.accessDeniedHandler((request, response, exception) -> writeError(response,
								HttpStatus.FORBIDDEN.value(), "FORBIDDEN", "No tienes permiso para esta acción.")))
				.httpBasic(AbstractHttpConfigurer::disable)
				.formLogin(AbstractHttpConfigurer::disable)
				.logout(AbstractHttpConfigurer::disable)
				.build();
	}

	private static void writeError(HttpServletResponse response, int status, String code, String message)
			throws IOException {
		response.setStatus(status);
		response.setContentType(MediaType.APPLICATION_JSON_VALUE);
		response.setCharacterEncoding(StandardCharsets.UTF_8.name());
		response.getWriter().write("{\"code\":\"" + code + "\",\"message\":\"" + message + "\"}");
	}

}
