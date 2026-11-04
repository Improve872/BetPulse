"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError } from "@/lib/api";
import {
  adjustAdminWallet,
  searchAdminUsers,
  type AdminUser,
} from "@/lib/admin-users";
import { useAuth } from "@/lib/auth";
import { cn, formatMoney } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export function AdminUsersPage() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState("100.00");
  const [reason, setReason] = useState("");
  const [dataLoading, setDataLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = user?.roles.includes("ADMIN") ?? false;

  const load = useCallback(
    async (nextQuery: string) => {
      if (!isAdmin) {
        return;
      }
      setDataLoading(true);
      setError("");
      try {
        const next = await searchAdminUsers(nextQuery);
        setUsers(next);
        setSelected((current) => {
          if (!current) {
            return null;
          }
          return next.find((candidate) => candidate.id === current.id) ?? null;
        });
      } catch (caught) {
        setError(
          caught instanceof ApiError && caught.status === 403
            ? t("admin.denied")
            : t("admin.usersError"),
        );
      } finally {
        setDataLoading(false);
      }
    },
    [isAdmin, t],
  );

  useEffect(() => {
    void load("");
  }, [isAdmin, load]);

  const adjust = async (direction: 1 | -1) => {
    if (!selected) {
      return;
    }
    const parsed = Number.parseFloat(amount.replace(",", "."));
    const amountCents = Math.round(parsed * 100);
    if (!Number.isFinite(amountCents) || amountCents < 100) {
      setError(t("admin.invalidAmount"));
      return;
    }
    if (!reason.trim()) {
      setError(t("admin.reasonRequired"));
      return;
    }
    setSubmitting(true);
    setError("");
    setNotice("");
    try {
      await adjustAdminWallet(selected.id, direction * amountCents, reason.trim());
      setNotice(t("admin.adjustSuccess"));
      setReason("");
      await load(query);
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.usersError"),
      );
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
        onLogin={() => router.push("/")}
        onRegister={() => router.push("/")}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
              BetPulse
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
              {t("admin.usersTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("admin.usersSubtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-semibold text-accent-strong hover:underline"
            >
              {t("admin.bets")}
            </Link>
            <Link
              href="/admin/markets"
              className="text-xs font-semibold text-accent-strong hover:underline"
            >
              {t("admin.markets")}
            </Link>
            <Link
              href="/admin/streams"
              className="text-xs font-semibold text-accent-strong hover:underline"
            >
              {t("admin.streams")}
            </Link>
          </div>
        </div>

        {!loading && !isAdmin ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
            {t("admin.denied")}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        {isAdmin ? (
          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void load(query);
                }}
                className="flex gap-2"
              >
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("admin.searchUsers")}
                  className="min-w-0 flex-1 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
                />
                <button
                  type="submit"
                  className="rounded-lg bg-navy px-4 py-2 text-sm font-semibold text-white transition hover:bg-navy-soft"
                >
                  {t("admin.search")}
                </button>
              </form>

              <ul className="mt-4 divide-y divide-line">
                {users.map((candidate) => (
                  <li key={candidate.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(candidate);
                        setError("");
                        setNotice("");
                      }}
                      className={cn(
                        "flex w-full items-center justify-between gap-3 px-2 py-3 text-left transition",
                        selected?.id === candidate.id
                          ? "bg-accent/5"
                          : "hover:bg-slate-50",
                      )}
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink">
                          {candidate.displayName}
                        </span>
                        <span className="block truncate text-xs text-muted">
                          {candidate.email} · {candidate.roles || "USER"}
                        </span>
                      </span>
                      <span className="shrink-0 font-score text-sm font-semibold tabular-nums text-ink">
                        {formatMoney(candidate.availableCents, language)}
                      </span>
                    </button>
                  </li>
                ))}
                {!dataLoading && users.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted">
                    {t("admin.usersEmpty")}
                  </li>
                ) : null}
              </ul>
            </section>

            <section className="rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5">
              <h2 className="text-sm font-semibold text-ink">
                {t("admin.adjustTitle")}
              </h2>
              {selected ? (
                <>
                  <div className="mt-3 rounded-xl border border-line bg-slate-50 p-3">
                    <p className="truncate text-sm font-semibold text-ink">
                      {selected.displayName}
                    </p>
                    <p className="truncate text-xs text-muted">{selected.email}</p>
                    <div className="mt-2 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {t("admin.userBalance")}
                      </span>
                      <span className="font-score text-lg font-semibold tabular-nums text-ink">
                        {formatMoney(selected.availableCents, language)}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-muted">
                        {t("admin.userHeld")}
                      </span>
                      <span className="font-score text-sm font-semibold tabular-nums text-muted">
                        {formatMoney(selected.heldCents, language)}
                      </span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <label className="block text-xs font-semibold text-ink">
                      {t("admin.adjustAmount")}
                      <input
                        value={amount}
                        onChange={(event) => setAmount(event.target.value)}
                        inputMode="decimal"
                        className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                      />
                    </label>
                    <label className="block text-xs font-semibold text-ink">
                      {t("admin.adjustReason")}
                      <input
                        value={reason}
                        onChange={(event) => setReason(event.target.value)}
                        placeholder={t("admin.reasonPlaceholder")}
                        className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
                      />
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void adjust(1)}
                        className="rounded-lg bg-accent px-3 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t("admin.adjustCredit")}
                      </button>
                      <button
                        type="button"
                        disabled={submitting}
                        onClick={() => void adjust(-1)}
                        className="rounded-lg border border-line px-3 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {t("admin.adjustDebit")}
                      </button>
                    </div>
                    <p className="text-[11px] leading-4 text-muted">
                      {t("admin.adjustNote")}
                    </p>
                  </div>
                </>
              ) : (
                <p className="mt-4 text-sm text-muted">
                  {t("admin.selectUser")}
                </p>
              )}
            </section>
          </div>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
