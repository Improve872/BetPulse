"use client";

import { useEffect, useRef, useState } from "react";
import { CloseIcon, LockIcon, TicketIcon } from "@/components/icons";
import type { BetTarget } from "@/components/bet-slip";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { placeBet } from "@/lib/bets";
import { cn, formatMoney, formatOdds } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { marketTitle } from "@/lib/markets";
import { notifyWalletUpdated } from "@/lib/wallet-events";

export function QuickBetSlip({
  target,
  onClear,
  onLogin,
  onPlaced,
  compact = false,
  onClose,
}: {
  target: BetTarget | null;
  onClear: () => void;
  onLogin: () => void;
  onPlaced?: () => void;
  compact?: boolean;
  onClose?: () => void;
}) {
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
  const payoutCents =
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
      await placeBet(
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
      onPlaced?.();
      notifyWalletUpdated();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("bet.errorGeneric"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <aside
      id={compact ? undefined : "bet-slip"}
      className={cn("rounded-xl border border-line bg-white shadow-card", compact && "border-0 shadow-none")}
    >
      <div className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-[17px] font-bold leading-6 text-ink">
          {t("home.slip.title")}
          <span className="ml-1 font-semibold text-muted">
            · {target ? 1 : 0}
          </span>
        </h2>
        {compact && onClose ? (
          <button
            type="button"
            onClick={onClose}
            aria-label={t("bet.close")}
            className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-paper hover:text-ink"
          >
            <CloseIcon className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {target ? (
        <form onSubmit={handleSubmit}>
          <div className="space-y-3 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted">
                  {target.subject.homeName} vs {target.subject.awayName}
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-ink">
                  {target.selectionLabel}
                </p>
                <p className="mt-0.5 text-[11px] text-muted">
                  {marketTitle(target.market, t)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-score text-lg font-semibold tabular-nums text-ink">
                  {formatOdds(target.selection.odds)}
                </span>
                <button
                  type="button"
                  onClick={onClear}
                  aria-label={t("bet.clear")}
                  className="grid h-7 w-7 place-items-center rounded-md text-muted transition hover:bg-paper hover:text-ink"
                >
                  <CloseIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <label className="block">
              <span className="text-[11px] font-semibold text-muted">
                {t("home.slip.stake")}
              </span>
              <input
                type="text"
                inputMode="decimal"
                value={stake}
                onChange={(event) => setStake(event.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-line bg-paper px-3 py-2.5 text-sm font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>

            <div className="flex items-center justify-between rounded-lg bg-paper px-3 py-2">
              <span className="text-[11px] font-medium text-muted">
                {t("home.slip.return")}
              </span>
              <span className="font-score text-sm font-semibold tabular-nums text-ink">
                {payoutCents > 0 ? formatMoney(payoutCents, language) : "—"}
              </span>
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
                className="rounded-lg border border-pitch/25 bg-pitch-soft p-2.5 text-[11px] font-medium leading-4 text-pitch"
              >
                {notice}
              </p>
            ) : null}

            {user ? (
              <button
                type="submit"
                disabled={submitting || target.market.status !== "OPEN"}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-navy transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
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
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-bold text-navy transition hover:bg-accent-bright"
              >
                {t("bet.loginToBet")}
              </button>
            )}
          </div>
        </form>
      ) : (
        <div className="px-4 py-6 text-center">
          <TicketIcon className="mx-auto h-10 w-10 text-line" />
          <p className="mt-2 text-[15px] font-semibold text-ink">
            {t("home.slip.emptyTitle")}
          </p>
          <p className="mx-auto mt-1 max-w-[200px] text-[13px] leading-5 text-muted">
            {t("home.slip.emptyBody")}
          </p>
        </div>
      )}

      {target ? (
        <div className="border-t border-line px-4 py-2.5">
          <p className="flex items-start gap-2 text-[10px] leading-4 text-muted">
            <LockIcon className="mt-0.5 h-3 w-3 shrink-0" />
            {t("bet.note")}
          </p>
        </div>
      ) : null}
    </aside>
  );
}
