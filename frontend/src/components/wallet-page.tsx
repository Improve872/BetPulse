"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowRightIcon, CheckIcon, LockIcon, WalletIcon } from "@/components/icons";
import { AcceptedBrands, MethodLogo } from "@/components/brand-logo";
import { CheckoutCard } from "@/components/checkout-card";
import { CheckoutTransfer } from "@/components/checkout-transfer";
import { CheckoutWallet } from "@/components/checkout-wallet";
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
import {
  detailsFingerprint,
  emptyDetails,
  hasErrors,
  isValidPhone,
  maskedDetail,
  newOperationCode,
  validateDetails,
  type CheckoutErrors,
  type PaymentDetails,
  type PaymentMethod,
  type PaymentTab,
} from "@/lib/checkout";
import { cn, formatDateTime, formatMoney } from "@/lib/format";
import {
  useLanguage,
  type TranslationKey,
} from "@/lib/i18n";
import { notifyWalletUpdated } from "@/lib/wallet-events";

const quickAmounts = [10, 50, 100, 500];

type Step = "amount" | "details" | "review" | "processing" | "success";
type Translate = (key: TranslationKey) => string;

type CompletedOperation = {
  amountCents: number;
  method: PaymentMethod;
  detail: string;
  code: string;
  at: string;
  availableCents: number;
};

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
  const [tab, setTab] = useState<PaymentTab>("deposit");
  const [step, setStep] = useState<Step>("amount");
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("CARD");
  const [details, setDetails] = useState<PaymentDetails>(emptyDetails);
  const [errors, setErrors] = useState<CheckoutErrors>({});
  const [otpSent, setOtpSent] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [reference, setReference] = useState(() => newOperationCode());
  const [completed, setCompleted] = useState<CompletedOperation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [actionError, setActionError] = useState("");
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
      notifyWalletUpdated();
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

  useEffect(() => {
    if (!otpSent || resendIn <= 0) {
      return;
    }
    const timer = window.setTimeout(() => {
      setResendIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearTimeout(timer);
  }, [otpSent, resendIn]);

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const parsedAmount = Number.parseFloat(amount.replace(",", "."));
  const amountCents = Number.isFinite(parsedAmount)
    ? Math.round(parsedAmount * 100)
    : 0;
  const amountValid = amountCents >= 100 && amountCents <= 1_000_000;

  const methods: Array<{
    id: PaymentMethod;
    label: string;
    hint: string;
  }> = [
    { id: "CARD", label: t("wallet.methodCard"), hint: t("checkout.cardHint") },
    { id: "YAPE", label: t("wallet.methodYape"), hint: t("wallet.methodInstant") },
    { id: "PLIN", label: t("wallet.methodPlin"), hint: t("wallet.methodInstant") },
    {
      id: "TRANSFER",
      label: t("wallet.methodTransfer"),
      hint: t("wallet.methodBank"),
    },
  ];
  const selectedMethod = methods.find((item) => item.id === method) ?? methods[0]!;

  const updateDetails = (patch: Partial<PaymentDetails>) => {
    const phoneChanged =
      patch.phone !== undefined && patch.phone !== details.phone;
    setDetails((current) => ({
      ...current,
      ...patch,
      ...(phoneChanged ? { otp: "" } : {}),
    }));
    if (phoneChanged) {
      setOtpSent(false);
      setResendIn(0);
    }
    setErrors((current) => {
      const next = { ...current };
      for (const key of Object.keys(patch)) {
        delete next[key as keyof CheckoutErrors];
      }
      return next;
    });
    setActionError("");
  };

  const changeTab = (next: PaymentTab) => {
    if (next === tab) {
      return;
    }
    setTab(next);
    setStep("amount");
    setAmount("");
    setAmountError("");
    setErrors({});
    setActionError("");
    setOtpSent(false);
    setResendIn(0);
    setDetails((current) => ({ ...current, otp: "" }));
    setReference(newOperationCode());
  };

  const handleAmountContinue = () => {
    if (!amountValid) {
      setAmountError(t("wallet.errorAmount"));
      return;
    }
    setAmountError("");
    setStep("details");
  };

  const handleSendCode = () => {
    if (!isValidPhone(details.phone)) {
      setErrors((current) => ({ ...current, phone: "checkout.errorPhone" }));
      return;
    }
    setOtpSent(true);
    setResendIn(30);
    setDetails((current) => ({ ...current, otp: "" }));
    setErrors((current) => {
      const next = { ...current };
      delete next.phone;
      delete next.otp;
      return next;
    });
  };

  const handleDetailsContinue = () => {
    const nextErrors = validateDetails(tab, method, details);
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      setActionError(t("checkout.errorReview"));
      return;
    }
    setErrors({});
    setActionError("");
    setStep("review");
  };

  const handleSubmit = async () => {
    const nextErrors = validateDetails(tab, method, details);
    if (hasErrors(nextErrors)) {
      setErrors(nextErrors);
      setActionError(t("checkout.errorReview"));
      setStep("details");
      return;
    }

    setSubmitting(true);
    setActionError("");
    setStep("processing");
    try {
      const signature = detailsFingerprint(tab, method, details);
      if (idempotencyRef.current?.signature !== signature) {
        idempotencyRef.current = { signature, key: crypto.randomUUID() };
      }
      await new Promise((resolve) => window.setTimeout(resolve, 900));
      const response = await apiFetch<WalletOperation>(
        tab === "deposit" ? "/api/wallet/deposits" : "/api/wallet/withdrawals",
        {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyRef.current.key },
          body: JSON.stringify({ amountCents }),
        },
      );
      idempotencyRef.current = null;
      setCompleted({
        amountCents,
        method,
        detail: maskedDetail(tab, method, details),
        code: newOperationCode(),
        at: new Date().toISOString(),
        availableCents: response.availableCents,
      });
      setStep("success");
      setAmount("");
      await loadData();
    } catch (error) {
      setStep("review");
      setActionError(
        error instanceof ApiError ? error.message : t("wallet.errorGeneric"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const resetCheckout = () => {
    idempotencyRef.current = null;
    setStep("amount");
    setAmount("");
    setAmountError("");
    setDetails(emptyDetails);
    setErrors({});
    setMethod("CARD");
    setOtpSent(false);
    setResendIn(0);
    setReference(newOperationCode());
    setCompleted(null);
    setActionError("");
  };

  const processingLabel = () => {
    if (tab === "withdraw") {
      return t("checkout.processingWithdraw");
    }
    if (method === "CARD") {
      return t("checkout.processingCard");
    }
    if (method === "YAPE") {
      return t("checkout.processingYape");
    }
    if (method === "PLIN") {
      return t("checkout.processingPlin");
    }
    return t("checkout.processingTransfer");
  };

  const stepIndex = step === "review" || step === "success" || step === "processing"
    ? 2
    : step === "details"
      ? 1
      : 0;

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

            <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
              <section className="rounded-2xl border border-line bg-surface p-5 shadow-card sm:p-6">
                {step !== "processing" && step !== "success" ? (
                  <CheckoutSteps current={stepIndex} t={t} />
                ) : null}

                {step === "amount" ? (
                  <div className="mt-5">
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

                    <form
                      onSubmit={(event) => {
                        event.preventDefault();
                        handleAmountContinue();
                      }}
                      className="mt-5 space-y-5"
                    >
                      <div>
                        <label htmlFor="wallet-amount" className="text-xs font-semibold text-ink">
                          {t("wallet.amount")}
                        </label>
                        <div className="relative mt-1.5">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted">
                            S/
                          </span>
                          <input
                            id="wallet-amount"
                            type="text"
                            inputMode="decimal"
                            value={amount}
                            onChange={(event) => {
                              setAmount(event.target.value);
                              setAmountError("");
                            }}
                            placeholder={t("wallet.amountPlaceholder")}
                            aria-invalid={Boolean(amountError)}
                            aria-describedby={amountError ? "wallet-amount-error" : undefined}
                            className="w-full rounded-lg border border-line bg-white py-3 pl-9 pr-3 text-lg font-semibold text-ink outline-none transition placeholder:text-base placeholder:font-normal placeholder:text-muted/50 focus:border-accent focus:ring-2 focus:ring-accent/15 aria-invalid:border-red-300"
                          />
                        </div>
                        {amountError ? (
                          <p id="wallet-amount-error" className="mt-1.5 text-[11px] leading-4 text-red-600">
                            {amountError}
                          </p>
                        ) : null}
                        <div className="mt-2 flex flex-wrap gap-2">
                          {quickAmounts.map((value) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => {
                                setAmount(String(value));
                                setAmountError("");
                              }}
                              className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-muted transition hover:border-accent/40 hover:text-accent-strong"
                            >
                              S/ {value}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-ink">
                          {tab === "deposit"
                            ? t("wallet.method")
                            : t("wallet.withdrawMethod")}
                        </p>
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {methods.map((option) => (
                            <button
                              key={option.id}
                              type="button"
                              onClick={() => {
                                setMethod(option.id);
                                setErrors({});
                                setActionError("");
                              }}
                              aria-pressed={method === option.id}
                              className={cn(
                                "relative flex flex-col gap-2 rounded-xl border p-3 text-left transition",
                                method === option.id
                                  ? "border-accent/60 bg-accent/5 ring-1 ring-accent/20"
                                  : "border-line bg-white hover:border-slate-300",
                              )}
                            >
                              <span className="flex h-5 items-center">
                                <MethodLogo method={option.id} />
                              </span>
                              <span className="min-w-0">
                                <span className="block truncate text-xs font-semibold text-ink">
                                  {option.label}
                                </span>
                                <span className="block text-[10px] text-muted">
                                  {option.hint}
                                </span>
                              </span>
                              {method === option.id ? (
                                <CheckIcon className="absolute right-2 top-2 h-3.5 w-3.5 text-accent-strong" />
                              ) : null}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright"
                      >
                        {t("checkout.continue")}
                      </button>
                    </form>
                  </div>
                ) : null}

                {step === "details" ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("amount");
                        setActionError("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
                    >
                      <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
                      {t("checkout.back")}
                    </button>

                    <div className="mt-4">
                      {method === "CARD" ? (
                        <CheckoutCard
                          mode={tab}
                          value={details}
                          onChange={updateDetails}
                          errors={errors}
                          t={t}
                        />
                      ) : method === "YAPE" || method === "PLIN" ? (
                        <CheckoutWallet
                          method={method}
                          mode={tab}
                          value={details}
                          onChange={updateDetails}
                          errors={errors}
                          t={t}
                          otpSent={otpSent}
                          resendIn={resendIn}
                          onSendCode={handleSendCode}
                          onResend={handleSendCode}
                        />
                      ) : (
                        <CheckoutTransfer
                          mode={tab}
                          value={details}
                          onChange={updateDetails}
                          errors={errors}
                          t={t}
                          reference={reference}
                        />
                      )}
                    </div>

                    {actionError ? (
                      <p
                        role="alert"
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
                      >
                        {actionError}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={handleDetailsContinue}
                      className="mt-5 w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright"
                    >
                      {t("checkout.continue")}
                    </button>
                  </div>
                ) : null}

                {step === "review" ? (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setStep("details");
                        setActionError("");
                      }}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition hover:text-ink"
                    >
                      <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
                      {t("checkout.edit")}
                    </button>

                    <h2 className="mt-4 text-base font-semibold text-ink">
                      {t("checkout.reviewTitle")}
                    </h2>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      {t("checkout.reviewHint")}
                    </p>

                    <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4">
                      <ReviewRow
                        label={t("wallet.amount")}
                        value={formatMoney(amountCents, language)}
                      />
                      <ReviewRow
                        label={t("wallet.method")}
                        value={
                          <span className="inline-flex items-center gap-2">
                            <MethodLogo method={method} className="h-4" />
                            {selectedMethod.label}
                          </span>
                        }
                      />
                      <ReviewRow
                        label={t("checkout.detail")}
                        value={maskedDetail(tab, method, details)}
                      />
                      <ReviewRow label={t("wallet.fee")} value={formatMoney(0, language)} />
                      <div className="mt-2 flex items-center justify-between gap-3 border-t border-line pt-2 text-sm">
                        <span className="font-semibold text-ink">
                          {t("wallet.total")}
                        </span>
                        <span className="font-score font-semibold text-ink">
                          {formatMoney(amountCents, language)}
                        </span>
                      </div>
                    </div>

                    {actionError ? (
                      <p
                        role="alert"
                        className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-5 text-red-700"
                      >
                        {actionError}
                      </p>
                    ) : null}

                    <button
                      type="button"
                      onClick={() => void handleSubmit()}
                      disabled={submitting}
                      className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <LockIcon className="h-4 w-4" />
                      {tab === "deposit"
                        ? `${t("checkout.pay")} ${formatMoney(amountCents, language)}`
                        : `${t("checkout.withdrawAction")} ${formatMoney(amountCents, language)}`}
                    </button>
                    <p className="mt-2 flex items-center justify-center gap-1.5 text-[11px] text-muted">
                      <LockIcon className="h-3 w-3" />
                      {t("checkout.secure")}
                    </p>
                  </div>
                ) : null}

                {step === "processing" ? (
                  <div className="flex flex-col items-center py-14 text-center">
                    <span className="h-10 w-10 animate-spin rounded-full border-2 border-accent border-t-transparent" />
                    <p className="mt-4 text-sm font-semibold text-ink">
                      {processingLabel()}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatMoney(amountCents, language)} ·{" "}
                      {selectedMethod.label}
                    </p>
                  </div>
                ) : null}

                {step === "success" && completed ? (
                  <div className="flex flex-col items-center py-4 text-center">
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
                      <div className="flex items-center justify-between gap-3 text-xs">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted">
                          {t("checkout.receipt")}
                        </span>
                        <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-muted">
                          {completed.code}
                        </span>
                      </div>
                      <div className="mt-3 space-y-2">
                        <ReviewRow
                          label={t("wallet.amount")}
                          value={formatMoney(completed.amountCents, language)}
                        />
                        <ReviewRow
                          label={t("wallet.method")}
                          value={
                            <span className="inline-flex items-center gap-2">
                              <MethodLogo method={completed.method} className="h-4" />
                              {methods.find((item) => item.id === completed.method)?.label}
                            </span>
                          }
                        />
                        <ReviewRow label={t("checkout.detail")} value={completed.detail} />
                        <ReviewRow
                          label={t("checkout.date")}
                          value={formatDateTime(completed.at, language)}
                        />
                        <div className="flex items-center justify-between gap-3 border-t border-line pt-2 text-sm">
                          <span className="text-muted">{t("wallet.newBalance")}</span>
                          <span className="font-score font-semibold text-ink">
                            {formatMoney(completed.availableCents, language)}
                          </span>
                        </div>
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
                ) : null}
              </section>

              <aside className="space-y-5">
                {step !== "success" && step !== "processing" ? (
                  <section className="rounded-2xl border border-line bg-surface p-5 shadow-card lg:sticky lg:top-24">
                    <h2 className="text-sm font-semibold text-ink">
                      {t("wallet.summary")}
                    </h2>
                    <div className="mt-3 space-y-2 text-xs">
                      <SummaryRow
                        label={t("wallet.amount")}
                        value={
                          amountCents > 0 ? formatMoney(amountCents, language) : "—"
                        }
                      />
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted">{t("wallet.method")}</span>
                        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                          <MethodLogo method={method} className="h-3.5" />
                          {selectedMethod.label}
                        </span>
                      </div>
                      <SummaryRow label={t("wallet.fee")} value={formatMoney(0, language)} />
                      <div className="flex items-center justify-between gap-3 border-t border-line pt-2 text-sm">
                        <span className="font-semibold text-ink">
                          {t("wallet.total")}
                        </span>
                        <span className="font-score font-semibold text-ink">
                          {amountCents > 0 ? formatMoney(amountCents, language) : "—"}
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 border-t border-line pt-3">
                      <AcceptedBrands />
                    </div>
                    <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted">
                      <LockIcon className="h-3 w-3" />
                      {t("checkout.secure")}
                    </p>
                  </section>
                ) : null}

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
              </aside>
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

function CheckoutSteps({
  current,
  t,
}: {
  current: number;
  t: Translate;
}) {
  const steps = [
    t("checkout.stepAmount"),
    t("checkout.stepPayment"),
    t("checkout.stepReview"),
  ];
  return (
    <ol className="flex items-center gap-2">
      {steps.map((label, index) => {
        const done = index < current;
        const active = index === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className={cn(
                "grid h-6 w-6 shrink-0 place-items-center rounded-full text-[10px] font-bold transition",
                done
                  ? "bg-navy text-white"
                  : active
                    ? "bg-accent text-navy"
                    : "bg-slate-100 text-muted",
              )}
            >
              {done ? <CheckIcon className="h-3.5 w-3.5" /> : index + 1}
            </span>
            <span
              className={cn(
                "truncate text-[11px] font-semibold",
                active ? "text-ink" : "text-muted",
              )}
            >
              {label}
            </span>
            {index < steps.length - 1 ? (
              <span
                aria-hidden
                className={cn(
                  "h-px min-w-3 flex-1",
                  index < current ? "bg-navy/40" : "bg-line",
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function ReviewRow({
  label,
  value,
}: {
  label: string;
  value: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted">{label}</span>
      <span className="min-w-0 truncate text-right font-semibold text-ink">
        {value}
      </span>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted">{label}</span>
      <span className="font-semibold text-ink">{value}</span>
    </div>
  );
}
