"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  ArrowRightIcon,
  CloseIcon,
  LockIcon,
  TicketIcon,
} from "@/components/icons";
import { TeamCrest } from "@/components/team-crest";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { placeBet, type Bet } from "@/lib/bets";
import { cn, formatMoney, formatOdds } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { matchSelectionLabel } from "@/lib/match-labels";
import type { LobbyMatch } from "@/lib/lobby";
import { marketTitle, type Market, type Selection } from "@/lib/markets";

export type BetTarget = {
  match: LobbyMatch;
  market: Market;
  selection: Selection;
};

type BetSlipProps = {
  target: BetTarget | null;
  onClear: () => void;
  onLogin: () => void;
  onExplore: () => void;
  onPlaced?: (bet: Bet) => void;
  compact?: boolean;
  onClose?: () => void;
};

const quickStakes = [10, 20, 50];

export function BetSlip({
  target,
  onClear,
  onLogin,
  onExplore,
  onPlaced,
  compact = false,
  onClose,
}: BetSlipProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const [stake, setStake] = useState("10.00");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const idempotencyKey = useRef<string | null>(null);

  useEffect(() => {
    setError("");
    setNotice("");
    idempotencyKey.current = null;
  }, [target?.market.id, target?.selection.key, target?.market.version, stake]);

  const parsedStake = Number.parseFloat(stake.replace(",", "."));
  const stakeCents = Number.isFinite(parsedStake)
    ? Math.round(parsedStake * 100)
    : 0;
  const potentialPayoutCents =
    target && stakeCents > 0
      ? Math.round(stakeCents * Number(target.selection.odds))
      : 0;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!target) {
      return;
    }
    if (!user) {
      onLogin();
      return;
    }
    if (target.market.status !== "OPEN") {
      setError(t("bet.marketUnavailable"));
      return;
    }
    if (stakeCents < 100 || stakeCents > 100_000) {
      setError(t("bet.errorStake"));
      return;
    }

    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      const key = idempotencyKey.current ?? crypto.randomUUID();
      idempotencyKey.current = key;
      const bet = await placeBet(
        {
          marketId: target.market.id,
          selectionKey: target.selection.key,
          stakeCents,
          expectedOdds: Number(target.selection.odds),
          marketVersion: target.market.version,
        },
        key,
      );
      setNotice(t("bet.success"));
      idempotencyKey.current = null;
      onPlaced?.(bet);
    } catch (caught) {
      if (caught instanceof ApiError) {
        setError(caught.message);
      } else {
        setError(t("bet.errorGeneric"));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside
      id={compact ? undefined : "bet-slip"}
      className={compact ? "" : "hidden lg:block"}
    >
      <div
        className={cn(
          "overflow-hidden rounded-2xl border border-arena-line bg-arena-surface shadow-arena",
          compact ? "" : "sticky top-24",
        )}
      >
        <div className="flex items-center justify-between border-b border-arena-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-arena-ink">
            <TicketIcon className="h-4 w-4 text-accent" />
            {t("bet.title")}
          </h2>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-white/5 px-2 py-0.5 text-[11px] font-semibold text-arena-muted">
              {target ? 1 : 0}
            </span>
            {compact && onClose ? (
              <button
                type="button"
                onClick={onClose}
                aria-label={t("bet.close")}
                className="grid h-7 w-7 place-items-center rounded-md text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>

        {target ? (
          <form onSubmit={handleSubmit}>
            <div className="border-b border-arena-line px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <TeamCrest team={target.match.radiant} size="xs" />
                  <span className="min-w-0 flex-1 truncate text-xs font-semibold text-arena-ink">
                    {target.match.radiant.name}
                  </span>
                  <span className="text-[11px] font-semibold uppercase text-arena-muted">
                    vs
                  </span>
                  <span className="min-w-0 flex-1 truncate text-right text-xs font-semibold text-arena-ink">
                    {target.match.dire.name}
                  </span>
                  <TeamCrest team={target.match.dire} size="xs" />
                </div>
                <button
                  type="button"
                  onClick={onClear}
                  aria-label={t("bet.clear")}
                  className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
                >
                  <CloseIcon className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2 text-[11px] text-arena-muted">
                {marketTitle(target.market, t)}
              </p>

              <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-arena-line bg-arena-raised/60 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-xs font-semibold text-arena-ink">
                    {matchSelectionLabel(
                      target.match,
                      target.market,
                      target.selection.key,
                      t,
                    )}
                  </p>
                  <p className="mt-0.5 text-[11px] text-arena-muted">
                    {t("bet.version", {
                      version: target.market.version,
                    })}
                  </p>
                </div>
                <span className="font-score text-xl font-semibold tabular-nums text-accent">
                  {formatOdds(target.selection.odds)}
                </span>
              </div>
            </div>

            <div className="space-y-3 px-4 py-3">
              <label className="block">
                <span className="text-xs font-semibold text-arena-ink">
                  {t("bet.stake")}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={stake}
                  onChange={(event) => setStake(event.target.value)}
                  required
                  placeholder={t("bet.stakePlaceholder")}
                  className="mt-1.5 w-full rounded-lg border border-arena-line bg-arena-raised px-3 py-2.5 text-sm text-arena-ink outline-none transition placeholder:text-arena-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/25"
                />
              </label>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-arena-muted">
                  {t("bet.quickStake")}
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {quickStakes.map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setStake(value.toFixed(2))}
                      className="rounded-lg border border-arena-line px-3 py-1.5 text-xs font-semibold text-arena-muted transition hover:border-accent/50 hover:text-accent"
                    >
                      S/ {value}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-accent/20 bg-accent/5 px-3 py-2.5">
                <span className="text-[11px] font-medium text-arena-muted">
                  {t("bet.potentialPayout")}
                </span>
                <span className="font-score text-sm font-semibold tabular-nums text-arena-ink">
                  {potentialPayoutCents > 0
                    ? formatMoney(potentialPayoutCents, language)
                    : "—"}
                </span>
              </div>

              {error ? (
                <p
                  role="alert"
                  className="rounded-lg border border-red-400/30 bg-red-500/10 p-2.5 text-[11px] leading-4 text-red-200"
                >
                  {error}
                </p>
              ) : null}
              {notice ? (
                <p
                  aria-live="polite"
                  className="rounded-lg border border-emerald-400/30 bg-emerald-500/10 p-2.5 text-[11px] leading-4 text-emerald-200"
                >
                  {notice}
                </p>
              ) : null}

              {user ? (
                <button
                  type="submit"
                  disabled={submitting || target.market.status !== "OPEN"}
                  className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting
                    ? t("bet.placing")
                    : target.market.status !== "OPEN"
                      ? t("bet.marketUnavailable")
                      : t("bet.place")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onLogin}
                  className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-navy transition hover:bg-accent-bright"
                >
                  {t("bet.loginToBet")}
                </button>
              )}

              <Link
                href="/bets"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-arena-line px-4 py-2.5 text-sm font-semibold text-arena-ink transition hover:bg-white/5"
              >
                {t("nav.myBets")}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </div>
          </form>
        ) : (
          <div className="px-5 py-9 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-arena-line bg-arena-raised text-arena-muted">
              <TicketIcon className="h-6 w-6" />
            </span>
            <h3 className="mt-4 text-sm font-semibold text-arena-ink">
              {t("bet.emptyTitle")}
            </h3>
            <p className="mx-auto mt-1 max-w-[220px] text-xs leading-5 text-arena-muted">
              {t("bet.emptyBody")}
            </p>
            <button
              type="button"
              onClick={onExplore}
              className="mt-5 inline-flex items-center gap-2 text-xs font-semibold text-accent transition hover:text-accent-bright"
            >
              {t("bet.explore")}
              <ArrowRightIcon className="h-4 w-4" />
            </button>
            {user ? (
              <Link
                href="/wallet"
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-arena-line px-4 py-2.5 text-sm font-semibold text-arena-ink transition hover:bg-white/5"
              >
                {t("header.wallet")}
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            ) : (
              <button
                type="button"
                onClick={onLogin}
                className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-arena-line px-4 py-2.5 text-sm font-semibold text-arena-ink transition hover:bg-white/5"
              >
                {t("bet.login")}
              </button>
            )}
          </div>
        )}

        <div className="border-t border-arena-line bg-arena-raised/40 px-4 py-3">
          <p className="flex items-start gap-2 text-[11px] leading-4 text-arena-muted">
            <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("bet.note")}
          </p>
        </div>
      </div>
    </aside>
  );
}
