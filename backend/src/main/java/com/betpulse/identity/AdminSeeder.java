package com.betpulse.identity;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.betpulse.wallet.WalletService;

@Component
public class AdminSeeder implements ApplicationRunner {

	private static final Logger log = LoggerFactory.getLogger(AdminSeeder.class);
	private static final String DEFAULT_PASSWORD = "Admin123!";

	private final UserRepository users;
	private final PasswordEncoder passwordEncoder;
	private final WalletService walletService;
	private final String email;
	private final String password;
	private final String displayName;

	public AdminSeeder(UserRepository users, PasswordEncoder passwordEncoder, WalletService walletService,
			@Value("${betpulse.admin.email:admin@betpulse.local}") String email,
			@Value("${betpulse.admin.password:Admin123!}") String password,
			@Value("${betpulse.admin.display-name:Administrador}") String displayName) {
		this.users = users;
		this.passwordEncoder = passwordEncoder;
		this.walletService = walletService;
		this.email = AuthService.normalizeEmail(email);
		this.password = password;
		this.displayName = displayName;
	}

	@Override
	@Transactional
	public void run(ApplicationArguments args) {
		users.findByEmail(email).ifPresentOrElse(
				user -> walletService.createWallet(user.getId()),
				() -> {
					User admin = new User(email, passwordEncoder.encode(password), displayName, "ACTIVE");
					admin.addRole("ADMIN");
					admin.addRole("USER");
					users.saveAndFlush(admin);
					walletService.createWallet(admin.getId());
					log.info("Admin account seeded for {}", email);
					if (DEFAULT_PASSWORD.equals(password)) {
						log.warn("Admin is using the default development password; change ADMIN_PASSWORD.");
					}
				});
	}

}
