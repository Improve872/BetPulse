"use client";

import { TicketIcon } from "@/components/icons";
import type { BetTarget } from "@/components/bet-slip";
import { formatOdds } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { marketTitle } from "@/lib/markets";

export function MobileBetBar({
  target,
  onOpen,
}: {
  target: BetTarget | null;
  onOpen: () => void;
}) {
  const { t } = useLanguage();

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur xl:hidden">
      <div className="mx-auto max-w-[1320px]">
        <button
          type="button"
          onClick={onOpen}
          className="flex w-full items-center gap-3 rounded-xl border border-line bg-white px-3 py-2 text-left transition hover:border-accent/40"
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent-strong">
            <TicketIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            {target ? (
              <>
                <span className="block truncate text-xs font-semibold text-ink">
                  {target.selectionLabel}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {marketTitle(target.market, t)} ·{" "}
                  {formatOdds(target.selection.odds)}
                </span>
              </>
            ) : (
              <>
                <span className="block text-xs font-semibold text-ink">
                  {t("home.betbar")}
                </span>
                <span className="block truncate text-[11px] text-muted">
                  {t("home.betbar.empty")}
                </span>
              </>
            )}
          </span>
          <span aria-hidden="true" className="shrink-0 text-lg text-muted">
            ›
          </span>
        </button>
      </div>
    </div>
  );
}
