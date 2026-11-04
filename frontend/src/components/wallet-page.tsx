"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRightIcon, CheckIcon, WalletIcon } from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  apiFetch,
  ApiError,
  type WalletBalance,
  type WalletOperation,
  type WalletTransaction,
} from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";

const quickAmounts = [10, 50, 100, 500];

type PaymentMethod = "YAPE" | "PLIN" | "TRANSFER" | "CARD";
type CheckoutStage = "form" | "processing" | "success";

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
  const [method, setMethod] = useState<PaymentMethod>("YAPE");
  const [stage, setStage] = useState<CheckoutStage>("form");
  const [result, setResult] = useState<WalletOperation | null>(null);
  const [completedAmount, setCompletedAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const idempotencyRef = useRef<{ signature: string; key: string } | null>(null);

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
    setStage("processing");
    try {
      const signature = `${tab}:${amountCents}:${method}`;
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }
      await new Promise((resolve) => window.setTimeout(resolve, 700));
      const response = await apiFetch<WalletOperation>(
        tab === "deposit" ? "/api/wallet/deposits" : "/api/wallet/withdrawals",
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyRef.current.key },
          body: JSON.stringify({ amountCents }),
        },
      );
      idempotencyRef.current = null;
      setResult(response);
      setCompletedAmount(amountCents);
      setStage("success");
      setAmount("");
      await loadData();
    } catch (error) {
      setStage("form");
      if (error instanceof ApiError) {
        setActionError(error.message);
      } else {
        setActionError(t("wallet.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetCheckout = () => {
    idempotencyRef.current = null;
    setStage("form");
    setResult(null);
    setCompletedAmount(0);
    setActionError("");
    setNotice("");
  };

  const changeTab = (next: "deposit" | "withdraw") => {
    setTab(next);
    setMethod("YAPE");
    resetCheckout();
  };

  const methods: Array<{
    id: PaymentMethod;
    label: string;
    hint: string;
    tone: string;
  }> =
    tab === "deposit"
      ? [
          { id: "YAPE", label: t("wallet.methodYape"), hint: t("wallet.methodInstant"), tone: "bg-violet-500" },
          { id: "PLIN", label: t("wallet.methodPlin"), hint: t("wallet.methodInstant"), tone: "bg-sky-500" },
          { id: "TRANSFER", label: t("wallet.methodTransfer"), hint: t("wallet.methodBank"), tone: "bg-slate-500" },
          { id: "CARD", label: t("wallet.methodCard"), hint: t("wallet.methodInstant"), tone: "bg-navy" },
        ]
      : [
          { id: "YAPE", label: t("wallet.methodYape"), hint: t("wallet.methodInstant"), tone: "bg-violet-500" },
          { id: "PLIN", label: t("wallet.methodPlin"), hint: t("wallet.methodInstant"), tone: "bg-sky-500" },
          { id: "TRANSFER", label: t("wallet.methodTransfer"), hint: t("wallet.methodBank"), tone: "bg-slate-500" },
        ];
  const parsedPreview = Number.parseFloat(amount.replace(",", "."));
  const previewCents = Number.isFinite(parsedPreview)
    ? Math.round(parsedPreview * 100)
    : 0;
  const selectedMethod =
    methods.find((candidate) => candidate.id === method) ?? methods[0]!;

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
              {t("wallet.loginHint")}
            </p>
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
          <>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
                  {t("wallet.available")}
                </p>
                <p className="mt-2 font-score text-3xl font-semibold text-ink">
                  {balance ? formatMoney(balance.availableCents, language) : "—"}
                </p>
              </article>
              <article className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted">
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
                    onClick={() => changeTab("deposit")}
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
                    onClick={() => changeTab("withdraw")}
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

                {stage === "success" ? (
                  <div className="mt-6 flex flex-col items-center text-center">
                    <span className="grid h-14 w-14 place-items-center rounded-full bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200">
                      <CheckIcon className="h-7 w-7" />
                    </span>
                    <h2 className="mt-4 text-lg font-semibold text-ink">
                      {t("wallet.successTitle")}
                    </h2>
                    <p className="mt-1 text-sm text-muted">
                      {tab === "deposit"
                        ? t("wallet.successDepositBody")
                        : t("wallet.successWithdrawBody")}
                    </p>
                    <div className="mt-5 w-full rounded-xl border border-line bg-slate-50 p-4 text-left">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted">{t("wallet.amount")}</span>
                        <span className="font-score font-semibold text-ink">
                          {formatMoney(completedAmount, language)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                        <span className="text-muted">
                          {tab === "deposit"
                            ? t("wallet.method")
                            : t("wallet.withdrawMethod")}
                        </span>
                        <span className="font-semibold text-ink">
                          {selectedMethod.label}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-sm">
                        <span className="text-muted">
                          {t("wallet.newBalance")}
                        </span>
                        <span className="font-score font-semibold text-ink">
                          {result
                            ? formatMoney(result.availableCents, language)
                            : "—"}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={resetCheckout}
                      className="mt-4 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright"
                    >
                      {t("wallet.another")}
                    </button>
                    <Link
                      href="/"
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
                    >
                      {t("wallet.back")}
                      <ArrowRightIcon className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : stage === "processing" ? (
                  <div className="mt-12 flex flex-col items-center text-center">
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="mt-4 text-sm font-semibold text-ink">
                      {t("wallet.processingPayment")}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatMoney(previewCents, language)} ·{" "}
                      {selectedMethod.label}
                    </p>
                  </div>
                ) : (
                  <>
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
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
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

                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
                          {tab === "deposit"
                            ? t("wallet.method")
                            : t("wallet.withdrawMethod")}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {methods.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => setMethod(option.id)}
                              aria-pressed={method === option.id}
                              className={cn(
                                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition",
                                method === option.id
                                  ? "border-accent/50 bg-accent/5"
                                  : "border-line bg-white hover:border-slate-300",
                              )}
                            >
                              <span
                                className={cn(
                                  "h-2.5 w-2.5 shrink-0 rounded-full",
                                  option.tone,
                                )}
                              />
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-ink">
                                  {option.label}
                                </span>
                                <span className="block text-[10px] text-muted">
                                  {option.hint}
                                </span>
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-xl border border-line bg-slate-50 p-3">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                          {t("wallet.summary")}
                        </p>
                        <div className="mt-2 space-y-1.5 text-xs">
                          <div className="flex justify-between gap-3">
                            <span className="text-muted">{t("wallet.amount")}</span>
                            <span className="font-semibold text-ink">
                              {formatMoney(Math.max(0, previewCents), language)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted">{t("wallet.method")}</span>
                            <span className="font-semibold text-ink">
                              {selectedMethod.label}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3">
                            <span className="text-muted">{t("wallet.fee")}</span>
                            <span className="font-semibold text-ink">
                              {formatMoney(0, language)}
                            </span>
                          </div>
                          <div className="flex justify-between gap-3 border-t border-line pt-1.5 text-sm">
                            <span className="font-semibold text-ink">
                              {t("wallet.total")}
                            </span>
                            <span className="font-score font-semibold text-ink">
                              {formatMoney(Math.max(0, previewCents), language)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={submitting || dataLoading}
                        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {tab === "deposit"
                          ? t("wallet.confirmDeposit")
                          : t("wallet.confirmWithdraw")}
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
                  </>
                )}
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
