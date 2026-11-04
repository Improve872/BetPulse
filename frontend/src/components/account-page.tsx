"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  ArrowRightIcon,
  LockIcon,
  UserIcon,
  WalletIcon,
} from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { apiFetch, ApiError, type WalletBalance } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export function AccountPage() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [wallet, setWallet] = useState<WalletBalance | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");

  const loadWallet = useCallback(async () => {
    if (!user) {
      setWallet(null);
      return;
    }
    try {
      setWallet(await apiFetch<WalletBalance>("/api/wallet"));
    } catch {
      setWallet(null);
    }
  }, [user]);

  useEffect(() => {
    void loadWallet();
  }, [loadWallet]);

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handlePassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setNotice("");
    if (newPassword !== confirmPassword) {
      setError(t("account.passwordMismatch"));
      return;
    }
    setSubmitting(true);
    try {
      await apiFetch<void>("/api/auth/password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setNotice(t("account.passwordSuccess"));
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("account.passwordError"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const isAdmin = user?.roles.includes("ADMIN") ?? false;

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        game="dota2"
        activeView="all"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-strong">
              BetPulse
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
              {t("account.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("account.subtitle")}</p>
          </div>
          <Link
            href="/wallet"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
          >
            {t("header.wallet")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        {loading ? (
          <div className="mt-6 h-40 animate-pulse rounded-2xl border border-line bg-surface" />
        ) : !user ? (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent-strong">
              <UserIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              {t("account.loginRequired")}
            </h2>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openLogin("login")}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright"
              >
                {t("wallet.loginAction")}
              </button>
              <button
                type="button"
                onClick={() => openLogin("register")}
                className="rounded-lg border border-line px-5 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
              >
                {t("wallet.registerAction")}
              </button>
            </div>
          </section>
        ) : (
          <div className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className="space-y-5">
              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <h2 className="text-sm font-semibold text-ink">
                  {t("account.profile")}
                </h2>
                <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {t("account.name")}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-ink">
                      {user.displayName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {t("account.email")}
                    </dt>
                    <dd className="mt-1 truncate text-sm font-semibold text-ink">
                      {user.email}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {t("account.since")}
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-ink">
                      {user.createdAt
                        ? formatDateTime(user.createdAt, language)
                        : "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {t("account.role")}
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {(user.roles.length > 0 ? user.roles : ["USER"]).map(
                        (role) => (
                          <span
                            key={role}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-muted"
                          >
                            {role === "ADMIN"
                              ? t("account.admin")
                              : t("account.user")}
                          </span>
                        ),
                      )}
                    </dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <LockIcon className="h-4 w-4 text-accent-strong" />
                  {t("account.security")}
                </h2>
                <form onSubmit={handlePassword} className="mt-4 space-y-3">
                  <label className="block text-xs font-semibold text-ink">
                    {t("account.currentPassword")}
                    <input
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      required
                      className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
                  </label>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="block text-xs font-semibold text-ink">
                      {t("account.newPassword")}
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        required
                        className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-ink">
                      {t("account.confirmPassword")}
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        required
                        className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      />
                    </label>
                  </div>
                  {error ? (
                    <p
                      role="alert"
                      className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-[11px] leading-4 text-red-700"
                    >
                      {error}
                    </p>
                  ) : null}
                  {notice ? (
                    <p
                      aria-live="polite"
                      className="rounded-lg border border-emerald-200 bg-emerald-50 p-2.5 text-[11px] leading-4 text-emerald-700"
                    >
                      {notice}
                    </p>
                  ) : null}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="rounded-lg bg-navy px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-navy-soft disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? t("wallet.processing")
                      : t("account.changePassword")}
                  </button>
                </form>
              </section>
            </div>

            <div className="space-y-5">
              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
                  <WalletIcon className="h-4 w-4 text-accent-strong" />
                  {t("account.wallet")}
                </h2>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-line bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t("wallet.available")}
                    </p>
                    <p className="mt-1 font-score text-lg font-semibold tabular-nums text-ink">
                      {wallet
                        ? formatMoney(wallet.availableCents, language)
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-line bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {t("wallet.held")}
                    </p>
                    <p className="mt-1 font-score text-lg font-semibold tabular-nums text-muted">
                      {wallet ? formatMoney(wallet.heldCents, language) : "—"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2">
                  <Link
                    href="/wallet"
                    className="inline-flex items-center justify-center rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright"
                  >
                    {t("account.recharge")}
                  </Link>
                  <Link
                    href="/bets"
                    className="inline-flex items-center justify-center rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
                  >
                    {t("account.viewBets")}
                  </Link>
                </div>
              </section>

              {isAdmin ? (
                <section className="rounded-2xl border border-accent/20 bg-accent/5 p-5 sm:p-6">
                  <h2 className="text-sm font-semibold text-ink">
                    {t("account.adminPanel")}
                  </h2>
                  <Link
                    href="/admin"
                    className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-strong hover:underline"
                  >
                    {t("nav.admin")}
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                </section>
              ) : null}
            </div>
          </div>
        )}
      </main>

      <SiteFooter />

      {loginOpen ? (
        <LoginModal
          open
          mode={loginMode}
          onModeChange={setLoginMode}
          onClose={() => setLoginOpen(false)}
        />
      ) : null}
    </div>
  );
}
