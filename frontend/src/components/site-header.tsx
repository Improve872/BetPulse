"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { GameSwitcher } from "@/components/game-switcher";
import { CloseIcon, MenuIcon, UserIcon, WalletIcon } from "@/components/icons";
import { LanguageToggle } from "@/components/language-toggle";
import { Logo } from "@/components/logo";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/format";
import { games } from "@/lib/games";
import { useLanguage } from "@/lib/i18n";
import type { GameId, LobbyView } from "@/lib/lobby";

type SiteHeaderProps = {
  game: GameId;
  activeView: LobbyView;
  onGameChange: (game: GameId) => void;
  onNavigate: (view: LobbyView) => void;
  onLogin: () => void;
  onRegister: () => void;
};

const navBase =
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium transition";

export function SiteHeader({
  game,
  activeView,
  onGameChange,
  onNavigate,
  onLogin,
  onRegister,
}: SiteHeaderProps) {
  const { t } = useLanguage();
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!menuOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const handleNavigate = (view: LobbyView) => {
    setMenuOpen(false);
    onNavigate(view);
  };

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
    }
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-navy text-white">
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden h-6 w-px bg-white/10 lg:block" />

        <div className="hidden lg:block">
          <GameSwitcher value={game} onChange={onGameChange} />
        </div>

        <nav className="hidden items-center gap-1 xl:flex" aria-label="Principal">
          <button
            type="button"
            onClick={() => handleNavigate("live")}
            className={cn(
              navBase,
              activeView === "live"
                ? "bg-white/5 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            {t("nav.live")}
            <span className="live-dot ml-1.5" />
          </button>
          <button
            type="button"
            onClick={() => handleNavigate("upcoming")}
            className={cn(
              navBase,
              activeView === "upcoming"
                ? "bg-white/5 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            {t("nav.upcoming")}
          </button>
          <button
            type="button"
            onClick={() => handleNavigate("results")}
            className={cn(
              navBase,
              activeView === "results"
                ? "bg-white/5 text-white"
                : "text-white/65 hover:bg-white/5 hover:text-white",
            )}
          >
            {t("nav.results")}
          </button>
          {user ? (
            <Link
              href="/bets"
              className={cn(navBase, "text-white/65 hover:bg-white/5 hover:text-white")}
            >
              {t("nav.myBets")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className={cn(navBase, "text-white/65 hover:bg-white/5 hover:text-white")}
            >
              {t("nav.myBets")}
            </button>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="hidden lg:block">
            <LanguageToggle />
          </div>

          {loading ? (
            <div className="hidden h-8 w-28 animate-pulse rounded-lg bg-white/10 sm:block" />
          ) : user ? (
            <>
              <Link
                href="/wallet"
                className="hidden items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <WalletIcon className="h-4 w-4" />
                {t("header.wallet")}
              </Link>
              <span className="hidden max-w-[150px] truncate text-sm font-semibold text-white/85 md:block">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={handleLogout}
                disabled={signingOut}
                className="hidden whitespace-nowrap rounded-lg border border-white/15 px-3 py-2 text-sm font-medium text-white/75 transition hover:border-white/30 hover:text-white disabled:cursor-not-allowed disabled:opacity-50 sm:inline-flex"
              >
                {t("header.logout")}
              </button>
              <Link
                href="/wallet"
                aria-label={t("header.wallet")}
                className="grid h-9 w-9 place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white sm:hidden"
              >
                <WalletIcon className="h-5 w-5" />
              </Link>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleLogin}
                className="hidden items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium text-white/75 transition hover:bg-white/10 hover:text-white sm:inline-flex"
              >
                <UserIcon className="h-4 w-4" />
                {t("header.login")}
              </button>

              <button
                type="button"
                onClick={handleLogin}
                aria-label={t("header.login")}
                className="grid h-9 w-9 place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white sm:hidden"
              >
                <UserIcon className="h-5 w-5" />
              </button>

              <button
                type="button"
                onClick={handleRegister}
                className="hidden whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgba(249,115,22,0.9)] transition hover:bg-accent-strong sm:inline-flex"
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
            className="grid h-9 w-9 place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white xl:hidden"
          >
            {menuOpen ? (
              <CloseIcon className="h-5 w-5" />
            ) : (
              <MenuIcon className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen ? (
        <div className="border-t border-white/10 bg-surface px-4 pb-5 pt-4 text-ink shadow-xl xl:hidden">
          <div className="mx-auto max-w-[1320px] space-y-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">
                {t("games.label")}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {games.map((gameOption) => (
                  <button
                    key={gameOption.id}
                    type="button"
                    disabled={!gameOption.available}
                    onClick={() => {
                      if (!gameOption.available) {
                        return;
                      }
                      onGameChange(gameOption.id);
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition",
                      gameOption.available
                        ? "border-accent/30 bg-accent/5 text-accent-strong"
                        : "cursor-not-allowed border-line bg-slate-50 text-muted/60",
                      gameOption.id === game && "ring-1 ring-accent/30",
                    )}
                  >
                    <span className="text-[10px] font-bold">{gameOption.mark}</span>
                    {gameOption.name}
                    {!gameOption.available ? (
                      <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-500">
                        {t("games.soon")}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { view: "live", label: t("nav.live") },
                  { view: "upcoming", label: t("nav.upcoming") },
                  { view: "results", label: t("nav.results") },
                ] as const
              ).map((item) => (
                <button
                  key={item.view}
                  type="button"
                  onClick={() => handleNavigate(item.view)}
                  className={cn(
                    "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition",
                    activeView === item.view
                      ? "border-accent/30 bg-accent/5 text-accent-strong"
                      : "border-line bg-white text-ink hover:bg-slate-50",
                  )}
                >
                  {item.label}
                </button>
              ))}
              {user ? (
                <Link
                  href="/bets"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-slate-50"
                >
                  {t("nav.myBets")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-lg border border-line bg-white px-3 py-2.5 text-left text-sm font-medium text-ink transition hover:bg-slate-50"
                >
                  {t("nav.myBets")}
                </button>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 border-t border-line pt-4">
              <div className="flex items-center gap-3">
                <LanguageToggle variant="light" />
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
                  className="rounded-lg border border-line px-3.5 py-2 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("header.logout")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong sm:hidden"
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
