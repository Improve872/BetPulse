package com.betpulse.identity;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AppUserDetailsService implements UserDetailsService {

	private final UserRepository users;

	public AppUserDetailsService(UserRepository users) {
		this.users = users;
	}

	@Override
	@Transactional(readOnly = true)
	public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
		String email = username == null ? "" : username.trim().toLowerCase();
		User user = users.findByEmail(email)
				.orElseThrow(() -> new UsernameNotFoundException("User not found"));
		return new AppUserPrincipal(user.getId(), user.getEmail(), user.getDisplayName(), user.getPasswordHash(),
				user.getRoles(), user.isActive());
	}

}
