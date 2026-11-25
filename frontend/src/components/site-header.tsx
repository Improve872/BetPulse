"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  BasketballIcon,
  ChevronDownIcon,
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  FootballIcon,
  GamepadIcon,
  MenuIcon,
  SearchIcon,
  StarIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { apiFetch, type WalletBalance } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { GameId, LobbyView } from "@/lib/lobby";
import { WALLET_UPDATED_EVENT } from "@/lib/wallet-events";

export type PublicSport = "esports" | "football" | "nba";

type SiteHeaderProps = {
  game: GameId;
  activeView: LobbyView;
  activeSport?: PublicSport;
  showSportsNav?: boolean;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
  onGameChange: (game: GameId) => void;
  onNavigate: (view: LobbyView) => void;
  onLogin: () => void;
  onRegister: () => void;
};

const navBase =
  "inline-flex h-9 items-center justify-center whitespace-nowrap rounded-md px-3 text-[15px] font-medium transition";

const sportItemBase =
  "relative inline-flex h-14 shrink-0 items-center gap-2 px-2.5 text-[14px] font-medium transition after:absolute after:inset-x-2 after:bottom-0 after:h-[2px] after:rounded-full after:transition sm:px-3 sm:text-[15px]";

function sportItemClass(active: boolean) {
  return cn(
    sportItemBase,
    active
      ? "text-accent after:bg-accent"
      : "text-ink/75 after:bg-transparent hover:bg-paper hover:text-ink",
  );
}

export function SiteHeader({
  activeSport,
  showSportsNav = false,
  searchQuery = "",
  onSearchChange,
  onLogin,
  onRegister,
}: SiteHeaderProps) {
  const pathname = usePathname();
  const { t, language } = useLanguage();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [balanceCents, setBalanceCents] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [hideBalance, setHideBalance] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      setHideBalance(window.localStorage.getItem("betpulse.balance.hidden") === "1");
    } catch {
      setHideBalance(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setBalanceCents(null);
      setBalanceLoading(false);
      return;
    }

    let active = true;
    const loadBalance = async () => {
      setBalanceLoading(true);
      try {
        const wallet = await apiFetch<WalletBalance>("/api/wallet");
        if (active) {
          setBalanceCents(wallet.availableCents);
        }
      } catch {
        if (active) {
          setBalanceCents(null);
        }
      } finally {
        if (active) {
          setBalanceLoading(false);
        }
      }
    };

    void loadBalance();
    const interval = window.setInterval(() => {
      void loadBalance();
    }, 30000);
    const handleFocus = () => {
      void loadBalance();
    };
    const handleUpdated = () => {
      void loadBalance();
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener(WALLET_UPDATED_EVENT, handleUpdated);

    return () => {
      active = false;
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener(WALLET_UPDATED_EVENT, handleUpdated);
    };
  }, [user]);

  const toggleBalance = () => {
    setHideBalance((current) => {
      const next = !current;
      try {
        window.localStorage.setItem("betpulse.balance.hidden", next ? "1" : "0");
      } catch {
        // Preference is best-effort; the toggle still works this session.
      }
      return next;
    });
  };

  useEffect(() => {
    if (!menuOpen && !accountOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        !headerRef.current?.contains(target) ||
        (!userMenuRef.current?.contains(target) && !menuOpen)
      ) {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
        setAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen, menuOpen]);

  const handleLogin = () => {
    setMenuOpen(false);
    onLogin();
  };

  const handleRegister = () => {
    setMenuOpen(false);
    onRegister();
  };

  const handleLogout = async () => {
    setSigningOut(true);
    try {
      await logout();
    } catch {
      // The local session is cleared even if the server call fails.
    } finally {
      setSigningOut(false);
      setMenuOpen(false);
      setAccountOpen(false);
    }
  };

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 bg-masthead text-white shadow-[0_1px_0_rgba(16,29,52,0.9)]"
    >
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-7">
        <Logo tone="light" />

        <nav className="hidden items-center gap-0.5 lg:flex" aria-label="Principal">
          <Link
            href="/"
            className={cn(
              navBase,
              pathname === "/"
                ? "text-white"
                : "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            {t("nav.home")}
          </Link>
          <Link
            href="/#esports"
            className={cn(
              navBase,
              "text-white/65 hover:bg-white/10 hover:text-white",
            )}
          >
            {t("nav.live")}
          </Link>
          {user ? (
            <Link
              href="/bets"
              className={cn(
                navBase,
                pathname === "/bets"
                  ? "text-white"
                  : "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              {t("nav.myBets")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className={cn(
                navBase,
                "text-white/65 hover:bg-white/10 hover:text-white",
              )}
            >
              {t("nav.myBets")}
            </button>
          )}
          {user?.roles.includes("ADMIN") ? (
            <Link
              href="/admin"
              className={cn(navBase, "text-accent hover:bg-white/10")}
            >
              {t("nav.admin")}
            </Link>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <LanguageToggle variant="bare" />
          </div>

          {loading ? (
            <div className="hidden h-9 w-28 animate-pulse rounded-lg bg-white/10 sm:block" />
          ) : user ? (
            <>
              <div className="hidden items-center rounded-lg border border-white/15 bg-white/5 p-0.5 sm:flex">
                <Link
                  href="/wallet"
                  aria-label={t("header.wallet")}
                  className="inline-flex min-w-[76px] items-center justify-center rounded-md px-2 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
                >
                  {balanceLoading && balanceCents === null ? (
                    <span className="h-3 w-12 animate-pulse rounded bg-white/20" />
                  ) : hideBalance ? (
                    <span className="tracking-[0.18em] text-white/60">
                      S/ ••••
                    </span>
                  ) : (
                    <span className="font-score tabular-nums">
                      {balanceCents === null
                        ? "S/ —"
                        : formatMoney(balanceCents, language)}
                    </span>
                  )}
                </Link>
                <button
                  type="button"
                  onClick={toggleBalance}
                  aria-label={
                    hideBalance
                      ? t("header.showBalance")
                      : t("header.hideBalance")
                  }
                  aria-pressed={hideBalance}
                  className="grid h-7 w-7 place-items-center rounded-md text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  {hideBalance ? (
                    <EyeIcon className="h-3.5 w-3.5" />
                  ) : (
                    <EyeOffIcon className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div ref={userMenuRef} className="relative hidden sm:block">
                <button
                  type="button"
                  onClick={() => setAccountOpen((current) => !current)}
                  aria-expanded={accountOpen}
                  aria-haspopup="menu"
                  className="inline-flex h-9 max-w-[190px] items-center gap-1.5 truncate rounded-md px-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
                >
                  <UserIcon className="h-4 w-4 text-white/60" />
                  <span className="truncate">{t("nav.account")}</span>
                  <ChevronDownIcon
                    className={cn(
                      "h-3.5 w-3.5 shrink-0 transition",
                      accountOpen ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>
                {accountOpen ? (
                  <div
                    role="menu"
                    className="absolute right-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl border border-line bg-white p-1.5 text-ink shadow-xl"
                  >
                    <Link
                      href="/account"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-paper"
                    >
                      <UserIcon className="h-4 w-4 text-muted" />
                      {t("nav.account")}
                    </Link>
                    <Link
                      href="/wallet"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-paper"
                    >
                      <WalletIcon className="h-4 w-4 text-muted" />
                      {t("header.wallet")}
                    </Link>
                    <Link
                      href="/bets"
                      onClick={() => setAccountOpen(false)}
                      className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-ink transition hover:bg-paper"
                    >
                      {t("nav.myBets")}
                    </Link>
                    {user.roles.includes("ADMIN") ? (
                      <Link
                        href="/admin"
                        onClick={() => setAccountOpen(false)}
                        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-accent-strong transition hover:bg-accent/10"
                      >
                        {t("nav.admin")}
                      </Link>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => void handleLogout()}
                      disabled={signingOut}
                      className="mt-1 flex w-full items-center gap-2 rounded-lg border-t border-line px-3 py-2 pt-2 text-left text-sm text-muted transition hover:bg-paper hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {t("header.logout")}
                    </button>
                  </div>
                ) : null}
              </div>
              <Link
                href="/wallet"
                className="hidden h-10 items-center rounded-lg bg-accent px-4 text-sm font-semibold text-masthead transition hover:bg-accent-bright sm:inline-flex"
              >
                {t("header.deposit")}
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleLogin}
                className="hidden h-10 items-center whitespace-nowrap rounded-lg border border-white/35 px-4 text-sm font-semibold text-white transition hover:border-white/60 hover:bg-white/10 sm:inline-flex"
              >
                {t("header.login")}
              </button>

              <button
                type="button"
                onClick={handleLogin}
                aria-label={t("header.login")}
                className="grid h-9 w-9 place-items-center rounded-md text-white/75 transition hover:bg-white/10 hover:text-white sm:hidden"
              >
                <UserIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleRegister}
                className="hidden h-10 items-center whitespace-nowrap rounded-lg bg-accent px-4 text-sm font-semibold text-masthead transition hover:bg-accent-bright sm:inline-flex"
              >
                {t("header.register")}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => setMenuOpen((currentOpen) => !currentOpen)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("header.closeMenu") : t("header.openMenu")}
            className="grid h-9 w-9 place-items-center rounded-md text-white/80 transition hover:bg-white/10 hover:text-white lg:hidden"
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {showSportsNav ? (
        <div className="border-t border-white/10 bg-white">
          <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4 sm:px-7">
            <nav
              aria-label="Deportes"
              className="no-scrollbar flex flex-1 items-center gap-0.5 overflow-x-auto"
            >
              <Link href="/" className={sportItemClass(pathname === "/")}>
                <StarIcon
                  className="h-4 w-4 sm:h-5 sm:w-5"
                  filled={pathname === "/"}
                />
                {t("nav.featured")}
              </Link>
              <Link
                href="/sports"
                className={sportItemClass(activeSport === "football")}
              >
                <FootballIcon className="hidden h-5 w-5 sm:block" />
                {t("nav.football")}
              </Link>
              <Link href="/nba" className={sportItemClass(activeSport === "nba")}>
                <BasketballIcon className="hidden h-5 w-5 sm:block" />
                {t("nav.nba")}
              </Link>
              <Link
                href="/#esports"
                className={sportItemClass(activeSport === "esports")}
              >
                <GamepadIcon className="hidden h-5 w-5 sm:block" />
                {t("nav.esports")}
              </Link>
            </nav>

            {onSearchChange ? (
              <div className="relative hidden shrink-0 lg:block">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={t("home.search")}
                  aria-label={t("home.search")}
                  className="h-10 w-[300px] rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {menuOpen ? (
        <div className="border-t border-white/10 bg-white px-4 pb-5 pt-4 text-ink shadow-xl lg:hidden">
          <div className="mx-auto max-w-[1320px] space-y-5">
            {onSearchChange ? (
              <div className="relative">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder={t("home.search")}
                  aria-label={t("home.search")}
                  className="h-11 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-2">
              <Link
                href="/"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
                  pathname === "/"
                    ? "border-accent/30 bg-accent/10 text-accent-strong"
                    : "border-line bg-white text-ink hover:bg-paper",
                )}
              >
                <StarIcon className="h-4 w-4" filled={pathname === "/"} />
                {t("nav.featured")}
              </Link>
              <Link
                href="/sports"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
                  activeSport === "football"
                    ? "border-accent/30 bg-accent/10 text-accent-strong"
                    : "border-line bg-white text-ink hover:bg-paper",
                )}
              >
                <FootballIcon className="h-4 w-4" />
                {t("nav.football")}
              </Link>
              <Link
                href="/nba"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
                  activeSport === "nba"
                    ? "border-accent/30 bg-accent/10 text-accent-strong"
                    : "border-line bg-white text-ink hover:bg-paper",
                )}
              >
                <BasketballIcon className="h-4 w-4" />
                {t("nav.nba")}
              </Link>
              <Link
                href="/#esports"
                onClick={() => setMenuOpen(false)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm font-semibold transition",
                  activeSport === "esports"
                    ? "border-accent/30 bg-accent/10 text-accent-strong"
                    : "border-line bg-white text-ink hover:bg-paper",
                )}
              >
                <GamepadIcon className="h-4 w-4" />
                {t("nav.esports")}
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {user ? (
                <Link
                  href="/bets"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-paper"
                >
                  {t("nav.myBets")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-paper"
                >
                  {t("nav.myBets")}
                </button>
              )}
              {user ? (
                <Link
                  href="/account"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-paper"
                >
                  {t("nav.account")}
                </Link>
              ) : null}
              {user?.roles.includes("ADMIN") ? (
                <Link
                  href="/admin"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2.5 text-left text-sm font-medium text-accent transition hover:bg-accent/15"
                >
                  {t("nav.admin")}
                </Link>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-3">
                <LanguageToggle />
                {user ? (
                  <span className="max-w-[150px] truncate text-sm font-semibold text-ink">
                    {user.displayName}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="text-sm font-semibold text-accent-strong"
                  >
                    {t("header.login")}
                  </button>
                )}
              </div>
              {user ? (
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={signingOut}
                  className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("header.logout")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-masthead transition hover:bg-accent-bright"
                >
                  {t("header.register")}
                </button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
