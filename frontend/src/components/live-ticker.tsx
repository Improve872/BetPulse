"use client";

import { ClockIcon } from "@/components/icons";
import { formatGameTime, formatUpdatedAt } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyMatch } from "@/lib/lobby";

type LiveTickerProps = {
  matches: LobbyMatch[];
  updatedAt: string;
  onOpen: (match: LobbyMatch) => void;
};

export function LiveTicker({ matches, updatedAt, onOpen }: LiveTickerProps) {
  const { t, language } = useLanguage();

  return (
    <section className="border-b border-white/10 bg-navy-soft text-white">
      <div className="mx-auto flex max-w-[1320px] items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <span className="flex shrink-0 items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-accent">
          <span className="live-dot" />
          {t("ticker.live")}
        </span>

        {matches.length > 0 ? (
          <div className="scrollbar-none flex min-w-0 flex-1 gap-2 overflow-x-auto">
            {matches.map((match) => (
              <button
                key={match.id}
                type="button"
                onClick={() => onOpen(match)}
                className="group flex shrink-0 items-center gap-2.5 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-left transition hover:border-white/20 hover:bg-white/[0.08]"
              >
                <span className="flex items-center gap-1.5 text-[10px] font-medium text-white/45">
                  <ClockIcon className="h-3 w-3" />
                  {formatGameTime(match.durationSeconds)}
                </span>
                <span className="max-w-[110px] truncate text-xs font-semibold text-white/85">
                  {match.radiant.name}
                </span>
                <span className="font-score text-sm font-semibold text-white">
                  {match.radiant.score}
                </span>
                <span className="text-white/25">:</span>
                <span className="font-score text-sm font-semibold text-white">
                  {match.dire.score}
                </span>
                <span className="max-w-[110px] truncate text-xs font-semibold text-white/85">
                  {match.dire.name}
                </span>
              </button>
            ))}
          </div>
        ) : (
          <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-white/45">
            <ClockIcon className="h-3.5 w-3.5" />
            {t("ticker.empty")}
          </div>
        )}

        <span className="hidden shrink-0 text-[10px] font-medium text-white/35 lg:block">
          {t("ticker.updated", {
            time: formatUpdatedAt(updatedAt, language),
          })}
        </span>
      </div>
    </section>
  );
}
