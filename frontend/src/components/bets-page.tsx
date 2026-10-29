"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ArrowRightIcon, TicketIcon } from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { betStatusKey, getBets, type Bet } from "@/lib/bets";
import { cn, formatDateTime, formatMoney, formatOdds } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  marketTitleForType,
  selectionLabelForType,
} from "@/lib/markets";

const statusClasses: Record<string, string> = {
  PLACED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOST: "bg-red-50 text-red-700 ring-red-200",
  VOID: "bg-slate-50 text-slate-500 ring-line",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function BetsPage() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");

  const load = useCallback(async () => {
    setDataLoading(true);
    setError("");
    try {
      setBets(await getBets(50));
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError(t("bets.loginRequired"));
      } else {
        setError(t("bets.error"));
      }
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      void load();
    } else {
      setBets([]);
    }
  }, [user, load]);

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
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

      <main className="mx-auto max-w-[1000px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-strong">
              {t("bets.subtitle")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t("bets.title")}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
            >
              {t("header.wallet")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
            >
              {t("bets.back")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : !user ? (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent-strong">
              <TicketIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              {t("bets.loginRequired")}
            </h2>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {t("bets.loginAction")}
            </button>
          </section>
        ) : dataLoading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-28 animate-pulse rounded-2xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : bets.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-line">
              <TicketIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              {t("bets.empty")}
            </h2>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {t("bets.back")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <ul className="mt-6 space-y-3">
            {bets.map((bet) => (
              <li
                key={bet.id}
                className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                      {t("bets.market")}
                    </p>
                    <h2 className="mt-1 text-sm font-semibold text-ink">
                      {marketTitleForType(
                        bet.marketType,
                        bet.marketTitle,
                        t,
                      )}
                    </h2>
                    <p className="mt-1 text-xs text-muted">
                      {selectionLabelForType(
                        bet.marketType,
                        bet.line,
                        bet.selectionKey,
                        t,
                      )}{" "}
                      · {formatOdds(Number(bet.odds))}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
                      statusClasses[bet.status] ??
                        "bg-slate-50 text-slate-500 ring-line",
                    )}
                  >
                    {t(betStatusKey(bet.status))}
                  </span>
                </div>

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-3 sm:grid-cols-4">
                  <div>
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("bets.stake")}
                    </dt>
                    <dd className="mt-1 font-score text-sm font-semibold text-ink">
                      {formatMoney(bet.stakeCents, language)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("bets.potentialPayout")}
                    </dt>
                    <dd className="mt-1 font-score text-sm font-semibold text-ink">
                      {formatMoney(bet.potentialPayoutCents, language)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("bets.odds")}
                    </dt>
                    <dd className="mt-1 font-score text-sm font-semibold text-ink">
                      {formatOdds(Number(bet.odds))}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
                      {t("bets.placedAt")}
                    </dt>
                    <dd className="mt-1 text-xs font-medium text-ink">
                      {formatDateTime(bet.createdAt, language)}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
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
