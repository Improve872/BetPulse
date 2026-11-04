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
  "inline-flex items-center justify-center whitespace-nowrap rounded-lg px-3 py-2 text-sm font-semibold transition";

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
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-white/10 bg-arena-soft/95 text-white backdrop-blur"
    >
      <div className="mx-auto flex h-16 max-w-[1320px] items-center gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />

        <div className="hidden h-6 w-px bg-white/10 lg:block" />

        <div className="hidden xl:block">
          <GameSwitcher value={game} onChange={onGameChange} />
        </div>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          <button
            type="button"
            onClick={() => handleNavigate("live")}
            className={cn(
              navBase,
              activeView === "live"
                ? "bg-white/10 text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            {t("nav.arena")}
          </button>
          {user ? (
            <Link
              href="/bets"
              className={cn(navBase, "text-white/60 hover:bg-white/5 hover:text-white")}
            >
              {t("nav.myBets")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={handleLogin}
              className={cn(navBase, "text-white/60 hover:bg-white/5 hover:text-white")}
            >
              {t("nav.myBets")}
            </button>
          )}
          {user?.roles.includes("ADMIN") ? (
            <Link
              href="/admin"
              className={cn(navBase, "text-accent hover:bg-accent/10")}
            >
              {t("nav.admin")}
            </Link>
          ) : null}
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
                className="hidden whitespace-nowrap rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-navy transition hover:bg-accent-bright sm:inline-flex"
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
            className="grid h-9 w-9 place-items-center rounded-lg text-white/75 transition hover:bg-white/10 hover:text-white lg:hidden"
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
        <div className="border-t border-white/10 bg-arena-surface px-4 pb-5 pt-4 text-arena-ink shadow-xl lg:hidden">
          <div className="mx-auto max-w-[1320px] space-y-5">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-arena-muted">
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
                        ? "border-accent/30 bg-accent/10 text-accent"
                        : "cursor-not-allowed border-arena-line bg-white/[0.03] text-arena-muted/60",
                      gameOption.id === game && "ring-1 ring-accent/30",
                    )}
                  >
                    <span className="text-[10px] font-bold">{gameOption.mark}</span>
                    {gameOption.name}
                    {!gameOption.available ? (
                      <span className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-arena-muted">
                        {t("games.soon")}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleNavigate("live")}
                className={cn(
                  "rounded-lg border px-3 py-2.5 text-left text-sm font-medium transition",
                  activeView === "live"
                    ? "border-accent/30 bg-accent/10 text-accent"
                    : "border-arena-line bg-white/[0.03] text-arena-ink hover:bg-white/[0.06]",
                )}
              >
                {t("nav.arena")}
              </button>
              {user ? (
                <Link
                  href="/bets"
                  onClick={() => setMenuOpen(false)}
                  className="rounded-lg border border-arena-line bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium text-arena-ink transition hover:bg-white/[0.06]"
                >
                  {t("nav.myBets")}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleLogin}
                  className="rounded-lg border border-arena-line bg-white/[0.03] px-3 py-2.5 text-left text-sm font-medium text-arena-ink transition hover:bg-white/[0.06]"
                >
                  {t("nav.myBets")}
                </button>
              )}
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

            <div className="flex items-center justify-between gap-3 border-t border-arena-line pt-4">
              <div className="flex items-center gap-3">
                <LanguageToggle />
                {user ? (
                  <span className="max-w-[150px] truncate text-sm font-semibold text-arena-ink">
                    {user.displayName}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleLogin}
                    className="text-sm font-semibold text-accent"
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
                  className="rounded-lg border border-arena-line px-3.5 py-2 text-sm font-semibold text-arena-ink transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {t("header.logout")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRegister}
                  className="rounded-lg bg-accent px-3.5 py-2 text-sm font-semibold text-navy transition hover:bg-accent-bright"
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
