package com.betpulse.identity;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public class AppUserPrincipal implements UserDetails {

	private final UUID id;
	private final String email;
	private final String displayName;
	private final String passwordHash;
	private final Set<String> roles;
	private final boolean active;

	public AppUserPrincipal(UUID id, String email, String displayName, String passwordHash, Set<String> roles,
			boolean active) {
		this.id = id;
		this.email = email;
		this.displayName = displayName;
		this.passwordHash = passwordHash;
		this.roles = Set.copyOf(roles);
		this.active = active;
	}

	public UUID getId() {
		return id;
	}

	public String getEmail() {
		return email;
	}

	public String getDisplayName() {
		return displayName;
	}

	public List<String> getRoleNames() {
		return roles.stream().sorted().toList();
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return roles.stream()
				.map(role -> new SimpleGrantedAuthority("ROLE_" + role))
				.collect(Collectors.toUnmodifiableSet());
	}

	@Override
	public String getPassword() {
		return passwordHash;
	}

	@Override
	public String getUsername() {
		return email;
	}

	@Override
	public boolean isAccountNonExpired() {
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		return active;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		return true;
	}

	@Override
	public boolean isEnabled() {
		return active;
	}

}
