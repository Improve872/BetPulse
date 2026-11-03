"use client";

import { cn, formatNumber } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyView } from "@/lib/lobby";

export function LobbyTabs({
  view,
  onChange,
  liveCount,
  resultCount,
}: {
  view: LobbyView;
  onChange: (view: LobbyView) => void;
  liveCount: number;
  resultCount: number;
}) {
  const { t, language } = useLanguage();

  const tabs: Array<{ id: LobbyView; label: string; count: number }> = [
    { id: "live", label: t("state.live"), count: liveCount },
    { id: "results", label: t("state.results"), count: resultCount },
  ];

  return (
    <div
      role="tablist"
      aria-label={t("lobby.tabsLabel")}
      className="scrollbar-none mt-6 flex gap-1 overflow-x-auto border-b border-arena-line"
    >
      {tabs.map((tab) => {
        const active = view === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={cn(
              "relative shrink-0 px-4 py-3 text-sm font-semibold transition",
              active
                ? "text-arena-ink"
                : "text-arena-muted hover:text-arena-ink",
            )}
          >
            <span className="inline-flex items-center gap-2">
              {tab.label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-semibold tabular-nums",
                  active
                    ? "bg-accent/15 text-accent"
                    : "bg-white/5 text-arena-muted",
                )}
              >
                {formatNumber(tab.count, language)}
              </span>
            </span>
            {active ? (
              <span className="absolute inset-x-3 bottom-0 h-0.5 rounded-full bg-accent" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
