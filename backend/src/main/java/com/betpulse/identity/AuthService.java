package com.betpulse.identity;

import java.util.regex.Pattern;

import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.identity.AuthDtos.LoginRequest;
import com.betpulse.identity.AuthDtos.RegisterRequest;
import com.betpulse.identity.AuthDtos.UserResponse;
import com.betpulse.shared.error.ApiException;
import com.betpulse.wallet.WalletService;

@Service
public class AuthService {

	private static final Pattern PASSWORD_POLICY = Pattern.compile("^(?=.*[A-Za-z])(?=.*\\d).+$");

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final AuthenticationManager authenticationManager;
	private final WalletService walletService;

	public AuthService(UserRepository users, PasswordEncoder passwordEncoder,
			AuthenticationManager authenticationManager, WalletService walletService) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.authenticationManager = authenticationManager;
		this.walletService = walletService;
	}

	@Transactional
	public AppUserPrincipal register(RegisterRequest request) {
		if (!request.acceptsTerms() || !request.isAdult()) {
			throw ApiException.badRequest("TERMS_REQUIRED",
					"Debes aceptar los términos y confirmar que eres mayor de edad.");
		}

		String email = normalizeEmail(request.email());
		if (users.existsByEmail(email)) {
			throw ApiException.conflict("EMAIL_TAKEN", "Ya existe una cuenta con ese correo.");
		}
		if (!PASSWORD_POLICY.matcher(request.password()).matches()) {
			throw ApiException.badRequest("WEAK_PASSWORD",
					"La contraseña debe tener al menos 8 caracteres, una letra y un número.");
		}

		User user = new User(email, passwordEncoder.encode(request.password()),
				request.displayName().trim(), "ACTIVE");
		user.addRole("USER");
		users.saveAndFlush(user);
		walletService.createWallet(user.getId());

		return toPrincipal(user);
	}

	public Authentication authenticate(LoginRequest request) {
		try {
			return authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(
					normalizeEmail(request.email()), request.password()));
		} catch (AuthenticationException exception) {
			throw ApiException.unauthorized("Correo o contraseña incorrectos.");
		}
	}

	public Authentication authenticationFor(AppUserPrincipal principal) {
		return UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
	}

	public UserResponse toResponse(AppUserPrincipal principal) {
		return new UserResponse(principal.getId(), principal.getEmail(), principal.getDisplayName(),
				principal.getRoleNames());
	}

	public AppUserPrincipal toPrincipal(User user) {
		return new AppUserPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getPasswordHash(),
				user.getRoles(), user.isActive());
	}

	public static String normalizeEmail(String email) {
		return email == null ? "" : email.trim().toLowerCase();
	}

}
