"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { betStatusKey, type BetStatus } from "@/lib/bets";
import { cn, formatDateTime, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

type AdminBet = {
  id: string;
  userEmail: string;
  matchId: string;
  marketTitle: string;
  selectionLabel: string;
  stakeCents: number;
  potentialPayoutCents: number;
  status: string;
  createdAt: string;
  payoutCents?: number | null;
  settledAt?: string | null;
};

type Filter = "NEEDS_REVIEW" | "PLACED" | "";

const statusClasses: Record<string, string> = {
  PLACED: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOST: "bg-red-50 text-red-700 ring-red-200",
  VOID: "bg-slate-50 text-slate-500 ring-line",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
};

export function AdminBetsPage() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [filter, setFilter] = useState<Filter>("NEEDS_REVIEW");
  const [bets, setBets] = useState<AdminBet[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");

  const isAdmin = user?.roles.includes("ADMIN") ?? false;

  const load = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setDataLoading(true);
    setError("");
    try {
      const query = filter ? `?status=${filter}&limit=100` : "?limit=100";
      setBets(await apiFetch<AdminBet[]>(`/api/admin/bets${query}`));
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 403
          ? t("admin.denied")
          : t("admin.loadError"),
      );
    } finally {
      setDataLoading(false);
    }
  }, [filter, isAdmin, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const voidBet = async (bet: AdminBet) => {
    const reason = window.prompt(t("admin.voidReason"));
    if (!reason?.trim()) {
      return;
    }
    try {
      await apiFetch(`/api/admin/bets/${bet.id}/void`, {
        method: "POST",
        body: JSON.stringify({ reason: reason.trim() }),
      });
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.loadError"),
      );
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        game="dota2"
        activeView="all"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => router.push("/")}
        onRegister={() => router.push("/")}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
              BetPulse
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
              {t("admin.title")}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("admin.subtitle")}</p>
          </div>
          <Link
            href="/admin/markets"
            className="text-xs font-semibold text-accent-strong hover:underline"
          >
            {t("admin.markets")}
          </Link>
        </div>

        {!loading && !isAdmin ? (
          <div className="mt-8 rounded-2xl border border-line bg-surface p-6 shadow-card">
            <p className="text-sm text-muted">{t("admin.denied")}</p>
            <Link
              href="/"
              className="mt-4 inline-flex rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white"
            >
              {t("bets.back")}
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-6 flex flex-wrap gap-2">
              {(
                [
                  ["NEEDS_REVIEW", t("admin.filter.review")],
                  ["PLACED", t("admin.filter.pending")],
                  ["", t("admin.filter.all")],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value || "all"}
                  type="button"
                  onClick={() => setFilter(value)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    filter === value
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-surface text-muted hover:border-slate-300 hover:text-ink",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            {error ? (
              <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <ul className="mt-4 space-y-3">
              {bets.map((bet) => (
                <li
                  key={bet.id}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                        {t("admin.user")} · {bet.userEmail}
                      </p>
                      <h2 className="mt-1 text-sm font-semibold text-ink">
                        {bet.marketTitle} · {bet.selectionLabel}
                      </h2>
                      <p className="mt-1 text-xs text-muted">
                        {t("admin.match")} {bet.matchId} ·{" "}
                        {formatMoney(bet.stakeCents, language)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
                        statusClasses[bet.status] ??
                          "bg-slate-50 text-slate-500 ring-line",
                      )}
                    >
                      {t(betStatusKey(bet.status as BetStatus))}
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-3">
                    <p className="text-[11px] text-muted">
                      {formatDateTime(bet.createdAt, language)}
                      {bet.payoutCents != null
                        ? ` · ${formatMoney(bet.payoutCents, language)}`
                        : ""}
                    </p>
                    {bet.status === "PLACED" ||
                    bet.status === "NEEDS_REVIEW" ? (
                      <button
                        type="button"
                        onClick={() => voidBet(bet)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        {t("admin.void")}
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>

            {!dataLoading && bets.length === 0 && !error ? (
              <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
                {t("admin.empty")}
              </p>
            ) : null}
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
