"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon, InfoIcon, WalletIcon } from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  apiFetch,
  ApiError,
  type WalletBalance,
  type WalletTransaction,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";

const quickAmounts = [10, 50, 100, 500];

const typeKeys: Record<string, TranslationKey> = {
  DEPOSIT: "wallet.type.DEPOSIT",
  WITHDRAWAL: "wallet.type.WITHDRAWAL",
  BET_HOLD: "wallet.type.BET_HOLD",
  BET_RELEASE: "wallet.type.BET_RELEASE",
  BET_WIN: "wallet.type.BET_WIN",
  BET_LOSS: "wallet.type.BET_LOSS",
};

export function WalletPage() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");
  const [tab, setTab] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");

  const loadData = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const [nextBalance, nextTransactions] = await Promise.all([
        apiFetch<WalletBalance>("/api/wallet"),
        apiFetch<WalletTransaction[]>("/api/wallet/transactions?limit=20"),
      ]);
      setBalance(nextBalance);
      setTransactions(nextTransactions);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        setDataError(t("wallet.loginRequired"));
      } else {
        setDataError(t("wallet.errorGeneric"));
      }
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      void loadData();
    } else {
      setBalance(null);
      setTransactions([]);
    }
  }, [user, loadData]);

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionError("");
    setNotice("");

    const parsed = Number.parseFloat(amount.replace(",", "."));
    const amountCents = Math.round(parsed * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100 || amountCents > 1_000_000) {
      setActionError(t("wallet.errorAmount"));
      return;
    }

    setSubmitting(true);
    try {
      await apiFetch(
        tab === "deposit" ? "/api/wallet/deposits" : "/api/wallet/withdrawals",
        {
          method: "POST",
          headers: { "Idempotency-Key": crypto.randomUUID() },
          body: JSON.stringify({ amountCents }),
        },
      );
      setNotice(
        tab === "deposit"
          ? t("wallet.successDeposit")
          : t("wallet.successWithdraw"),
      );
      setAmount("");
      await loadData();
    } catch (error) {
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t("wallet.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

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
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-strong">
              {t("wallet.subtitle")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t("wallet.title")}
            </h1>
          </div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
          >
            {t("wallet.back")}
            <ArrowRightIcon className="h-4 w-4" />
          </Link>
        </div>

        <p className="mt-3 flex items-start gap-2 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-xs leading-5 text-accent-strong">
          <InfoIcon className="mt-0.5 h-4 w-4 shrink-0" />
          {t("wallet.demoNote")}
        </p>

        {loading ? (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {[0, 1].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : !user ? (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent-strong">
              <WalletIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              {t("wallet.loginRequired")}
            </h2>
            <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted">
              {t("wallet.demoNote")}
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => openLogin("login")}
                className="rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
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
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  {t("wallet.available")}
                </p>
                <p className="mt-2 font-score text-3xl font-semibold text-ink">
                  {balance ? formatMoney(balance.availableCents, language) : "—"}
                </p>
              </article>
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted">
                  {t("wallet.held")}
                </p>
                <p className="mt-2 font-score text-3xl font-semibold text-muted">
                  {balance ? formatMoney(balance.heldCents, language) : "—"}
                </p>
              </article>
            </div>

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => {
                      setTab("deposit");
                      setActionError("");
                      setNotice("");
                    }}
                    aria-pressed={tab === "deposit"}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-semibold transition",
                      tab === "deposit"
                        ? "bg-white text-ink shadow-sm"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {t("wallet.deposit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab("withdraw");
                      setActionError("");
                      setNotice("");
                    }}
                    aria-pressed={tab === "withdraw"}
                    className={cn(
                      "rounded-lg px-3 py-2 text-sm font-semibold transition",
                      tab === "withdraw"
                        ? "bg-white text-ink shadow-sm"
                        : "text-muted hover:text-ink",
                    )}
                  >
                    {t("wallet.withdraw")}
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                  <label className="block">
                    <span className="text-xs font-semibold text-ink">
                      {t("wallet.amount")}
                    </span>
                    <input
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      required
                      placeholder={t("wallet.amountPlaceholder")}
                      className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
                  </label>

                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
                      {t("wallet.quick")}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {quickAmounts.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setAmount(String(value))}
                          className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-accent-strong"
                        >
                          S/ {value}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting || dataLoading}
                    className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting
                      ? t("wallet.processing")
                      : tab === "deposit"
                        ? t("wallet.submitDeposit")
                        : t("wallet.submitWithdraw")}
                  </button>
                </form>

                {actionError ? (
                  <p
                    role="alert"
                    className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
                  >
                    {actionError}
                  </p>
                ) : null}
                {notice ? (
                  <p
                    aria-live="polite"
                    className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-5 text-emerald-700"
                  >
                    {notice}
                  </p>
                ) : null}
              </section>

              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                <h2 className="text-sm font-semibold text-ink">
                  {t("wallet.history")}
                </h2>
                {dataLoading ? (
                  <div className="mt-4 space-y-3">
                    {[0, 1, 2].map((item) => (
                      <div
                        key={item}
                        className="h-10 animate-pulse rounded-lg bg-slate-100"
                      />
                    ))}
                  </div>
                ) : dataError ? (
                  <p className="mt-4 text-xs leading-5 text-red-600">{dataError}</p>
                ) : transactions.length === 0 ? (
                  <p className="mt-4 text-xs leading-5 text-muted">
                    {t("wallet.historyEmpty")}
                  </p>
                ) : (
                  <ul className="mt-3 divide-y divide-line">
                    {transactions.map((transaction) => {
                      const positive = transaction.amountCents >= 0;
                      const typeKey = typeKeys[transaction.type];
                      return (
                        <li
                          key={`${transaction.transactionId}-${transaction.type}`}
                          className="flex items-center justify-between gap-3 py-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-ink">
                              {typeKey ? t(typeKey) : transaction.type}
                            </p>
                            <p className="mt-0.5 text-[11px] text-muted">
                              {formatDateTime(transaction.createdAt, language)}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "shrink-0 font-mono text-xs font-semibold",
                              positive ? "text-emerald-600" : "text-red-600",
                            )}
                          >
                            {positive ? "+" : ""}
                            {formatMoney(transaction.amountCents, language)}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            </div>
          </>
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
