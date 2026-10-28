"use client";

import Link from "next/link";
import { ArrowRightIcon, LockIcon, TicketIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { useLanguage } from "@/lib/i18n";

type BetSlipProps = {
  onLogin: () => void;
  onExplore: () => void;
};

export function BetSlip({ onLogin, onExplore }: BetSlipProps) {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <aside className="hidden lg:block">
      <div className="sticky top-24 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
        <div className="flex items-center justify-between border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-ink">
            <TicketIcon className="h-4 w-4 text-accent" />
            {t("bet.title")}
          </h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted">
            0
          </span>
        </div>

        <div className="px-5 py-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-line">
            <TicketIcon className="h-6 w-6" />
          </span>
          <h3 className="mt-4 text-sm font-semibold text-ink">
            {t("bet.emptyTitle")}
          </h3>
          <p className="mx-auto mt-1 max-w-[220px] text-xs leading-5 text-muted">
            {t("bet.emptyBody")}
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
          >
            {t("bet.explore")}
            <ArrowRightIcon className="h-4 w-4" />
          </button>
          {user ? (
            <Link
              href="/wallet"
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              {t("header.wallet")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
            >
              {t("bet.login")}
            </button>
          )}
        </div>

        <div className="border-t border-line bg-slate-50 px-4 py-3">
          <p className="flex items-start gap-2 text-[11px] leading-4 text-muted">
            <LockIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {t("bet.note")}
          </p>
        </div>
      </div>
    </aside>
  );
}
