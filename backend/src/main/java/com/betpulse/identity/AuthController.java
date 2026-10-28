package com.betpulse.identity;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

import com.betpulse.identity.AuthDtos.AuthResponse;
import com.betpulse.identity.AuthDtos.CsrfResponse;
import com.betpulse.identity.AuthDtos.LoginRequest;
import com.betpulse.identity.AuthDtos.RegisterRequest;
import com.betpulse.identity.AuthDtos.UserResponse;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

	private final AuthService authService;
	private final SecurityContextRepository securityContextRepository;

	public AuthController(AuthService authService, SecurityContextRepository securityContextRepository) {
		this.authService = authService;
		this.securityContextRepository = securityContextRepository;
	}

	@GetMapping("/csrf")
	public CsrfResponse csrf(CsrfToken csrfToken) {
		return new CsrfResponse(csrfToken.getHeaderName(), csrfToken.getParameterName(), csrfToken.getToken());
	}

	@PostMapping("/register")
	public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
			HttpServletRequest servletRequest, HttpServletResponse servletResponse) {
		AppUserPrincipal principal = authService.register(request);
		establishSession(authService.authenticationFor(principal), servletRequest, servletResponse);
		return ResponseEntity.status(HttpStatus.CREATED).body(new AuthResponse(authService.toResponse(principal)));
	}

	@PostMapping("/login")
	public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest,
			HttpServletResponse servletResponse) {
		Authentication authentication = authService.authenticate(request);
		AppUserPrincipal principal = (AppUserPrincipal) authentication.getPrincipal();
		establishSession(authentication, servletRequest, servletResponse);
		return new AuthResponse(authService.toResponse(principal));
	}

	@GetMapping("/me")
	public UserResponse me(@AuthenticationPrincipal AppUserPrincipal principal) {
		return authService.toResponse(principal);
	}

	@PostMapping("/logout")
	public ResponseEntity<Void> logout(HttpServletRequest request, HttpServletResponse response) {
		new SecurityContextLogoutHandler().logout(request, response,
				SecurityContextHolder.getContext().getAuthentication());
		SecurityContextHolder.clearContext();
		return ResponseEntity.noContent().build();
	}

	private void establishSession(Authentication authentication, HttpServletRequest request,
			HttpServletResponse response) {
		SecurityContext context = SecurityContextHolder.createEmptyContext();
		context.setAuthentication(authentication);
		SecurityContextHolder.setContext(context);
		request.getSession(true);
		request.changeSessionId();
		securityContextRepository.saveContext(context, request, response);
	}

}
