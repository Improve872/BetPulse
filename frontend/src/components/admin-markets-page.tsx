"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError, apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatOdds } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { marketTitle, type Market } from "@/lib/markets";

export function AdminMarketsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [error, setError] = useState("");

  const isAdmin = user?.roles.includes("ADMIN") ?? false;

  const load = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setError("");
    try {
      setMarkets(await apiFetch<Market[]>("/api/admin/markets"));
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 403
          ? t("admin.denied")
          : t("admin.marketsError"),
      );
    }
  }, [isAdmin, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (
    market: Market,
    action: "suspend" | "resume" | "override",
  ) => {
    try {
      if (action === "resume") {
        await apiFetch(`/api/admin/markets/${market.id}/resume`, {
          method: "POST",
          body: JSON.stringify({ reason: "Reanudado por admin" }),
        });
      } else if (action === "suspend") {
        const reason = window.prompt(t("admin.reason"));
        if (!reason?.trim()) {
          return;
        }
        await apiFetch(`/api/admin/markets/${market.id}/suspend`, {
          method: "POST",
          body: JSON.stringify({ reason: reason.trim() }),
        });
      } else {
        const selectionKey = window.prompt(
          `${t("admin.overrideSelection")}: ${market.selections
            .map((selection) => selection.key)
            .join(", ")}`,
        );
        if (!selectionKey?.trim()) {
          return;
        }
        const odds = window.prompt(t("admin.overrideOdds"));
        if (!odds?.trim()) {
          return;
        }
        await apiFetch(`/api/admin/markets/${market.id}/override`, {
          method: "POST",
          body: JSON.stringify({
            selectionKey: selectionKey.trim().toUpperCase(),
            odds: Number(odds),
            reason: "Ajuste manual",
          }),
        });
      }
      await load();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t("admin.marketsError"));
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
              {t("admin.markets")}
            </h1>
          </div>
          <Link
            href="/admin"
            className="text-xs font-semibold text-accent-strong hover:underline"
          >
            {t("admin.bets")}
          </Link>
        </div>

        {!loading && !isAdmin ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
            {t("admin.denied")}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <ul className="mt-4 space-y-3">
          {markets.map((market) => (
            <li
              key={market.id}
              className="rounded-2xl border border-line bg-surface p-4 shadow-card"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-semibold text-ink">
                    {marketTitle(market, t)}
                  </h2>
                  <p className="mt-1 text-xs text-muted">
                    {market.matchId} · v{market.version}
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
                    market.status === "OPEN"
                      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                      : "bg-amber-50 text-amber-700 ring-amber-200",
                  )}
                >
                  {market.status}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {market.selections.map((selection) => (
                  <span
                    key={selection.key}
                    className="rounded-lg border border-line bg-white px-2.5 py-1 text-[11px] font-semibold text-ink"
                  >
                    {selection.key} · {formatOdds(selection.odds)}
                  </span>
                ))}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-line pt-3">
                <button
                  type="button"
                  onClick={() => act(market, "suspend")}
                  className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700"
                >
                  {t("admin.suspend")}
                </button>
                <button
                  type="button"
                  onClick={() => act(market, "resume")}
                  className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700"
                >
                  {t("admin.resume")}
                </button>
                <button
                  type="button"
                  onClick={() => act(market, "override")}
                  className="rounded-lg border border-line bg-white px-3 py-1.5 text-xs font-semibold text-ink"
                >
                  {t("admin.override")}
                </button>
              </div>
            </li>
          ))}
        </ul>

        {isAdmin && markets.length === 0 && !error ? (
          <p className="mt-6 rounded-2xl border border-dashed border-line bg-surface px-6 py-10 text-center text-sm text-muted">
            {t("admin.marketsEmpty")}
          </p>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
