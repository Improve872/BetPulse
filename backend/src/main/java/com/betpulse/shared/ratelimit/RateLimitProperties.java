package com.betpulse.shared.ratelimit;

import org.springframework.boot.context.properties.ConfigurationProperties;

/**
 * Límites de peticiones por minuto. En local-first el limitador es en memoria:
 * cada instancia del backend mantiene sus propias ventanas.
 */
@ConfigurationProperties(prefix = "betpulse.rate-limit")
public class RateLimitProperties {

	private boolean enabled = true;
	private int loginPerMinute = 10;
	private int registerPerMinute = 5;
	private int passwordPerMinute = 5;
	private int betPerMinute = 30;
	private int walletPerMinute = 20;
	private int adminPerMinute = 60;
	private int ingestPerMinute = 1200;

	public boolean isEnabled() {
		return enabled;
	}

	public void setEnabled(boolean enabled) {
		this.enabled = enabled;
	}

	public int getLoginPerMinute() {
		return loginPerMinute;
	}

	public void setLoginPerMinute(int loginPerMinute) {
		this.loginPerMinute = loginPerMinute;
	}

	public int getRegisterPerMinute() {
		return registerPerMinute;
	}

	public void setRegisterPerMinute(int registerPerMinute) {
		this.registerPerMinute = registerPerMinute;
	}

	public int getPasswordPerMinute() {
		return passwordPerMinute;
	}

	public void setPasswordPerMinute(int passwordPerMinute) {
		this.passwordPerMinute = passwordPerMinute;
	}

	public int getBetPerMinute() {
		return betPerMinute;
	}

	public void setBetPerMinute(int betPerMinute) {
		this.betPerMinute = betPerMinute;
	}

	public int getWalletPerMinute() {
		return walletPerMinute;
	}

	public void setWalletPerMinute(int walletPerMinute) {
		this.walletPerMinute = walletPerMinute;
	}

	public int getAdminPerMinute() {
		return adminPerMinute;
	}

	public void setAdminPerMinute(int adminPerMinute) {
		this.adminPerMinute = adminPerMinute;
	}

	public int getIngestPerMinute() {
		return ingestPerMinute;
	}

	public void setIngestPerMinute(int ingestPerMinute) {
		this.ingestPerMinute = ingestPerMinute;
	}

}
