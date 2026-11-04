"use client";

import { useRef } from "react";
import { ArrowRightIcon, TrophyIcon } from "@/components/icons";
import { OddsButton } from "@/components/odds-button";
import { TeamCrest } from "@/components/team-crest";
import { formatGameTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyMatch } from "@/lib/lobby";
import {
  matchSelectionLabel,
  matchTournamentLabel,
} from "@/lib/match-labels";
import { marketTitle, primaryMarket, type Market } from "@/lib/markets";

export function LiveRail({
  matches,
  markets,
  onOpen,
  onSelect,
  selectedFor,
}: {
  matches: LobbyMatch[];
  markets: Map<string, Market[]>;
  onOpen: (match: LobbyMatch) => void;
  onSelect: (match: LobbyMatch, market: Market, selection: Market["selections"][number]) => void;
  selectedFor: (matchId: string) => { marketId: string; selectionKey: string } | null;
}) {
  const { t } = useLanguage();
  const trackRef = useRef<HTMLDivElement>(null);

  if (matches.length === 0) {
    return null;
  }

  const move = (delta: number) => {
    trackRef.current?.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section className="mt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="live-dot" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
            {t("rail.title")}
          </h2>
          <span className="rounded-full bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-arena-muted">
            {matches.length}
          </span>
        </div>
        <div className="hidden items-center gap-1 sm:flex">
          <button
            type="button"
            onClick={() => move(-360)}
            aria-label={t("rail.previous")}
            className="grid h-8 w-8 place-items-center rounded-lg border border-arena-line text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
          >
            <ArrowRightIcon className="h-4 w-4 rotate-180" />
          </button>
          <button
            type="button"
            onClick={() => move(360)}
            aria-label={t("rail.next")}
            className="grid h-8 w-8 place-items-center rounded-lg border border-arena-line text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
          >
            <ArrowRightIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div
        ref={trackRef}
        className="scrollbar-none mt-3 flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1"
      >
        {matches.map((match) => {
          const market = primaryMarket(markets.get(match.id));
          return (
            <article
              key={match.id}
              className="min-w-[286px] max-w-[320px] flex-1 snap-start overflow-hidden rounded-2xl border border-arena-line bg-arena-surface"
            >
              <div className="flex items-center justify-between gap-2 border-b border-arena-line px-3.5 py-2.5">
                <span className="truncate text-[11px] font-medium text-arena-muted">
                  {matchTournamentLabel(match, t)}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.1em] text-live">
                  <span className="live-dot live-dot-sm" />
                  {formatGameTime(match.durationSeconds)}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onOpen(match)}
                className="block w-full px-3.5 py-3 text-left transition hover:bg-white/[0.02]"
              >
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <TeamCrest team={match.radiant} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-arena-ink">
                      {match.radiant.name}
                    </span>
                    <span className="font-score text-lg font-semibold tabular-nums text-arena-ink">
                      {match.radiant.score}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TeamCrest team={match.dire} size="sm" />
                    <span className="min-w-0 flex-1 truncate text-xs font-semibold text-arena-ink">
                      {match.dire.name}
                    </span>
                    <span className="font-score text-lg font-semibold tabular-nums text-arena-ink">
                      {match.dire.score}
                    </span>
                  </div>
                </div>
              </button>

              <div className="border-t border-arena-line px-3.5 py-2.5">
                <div className="mb-2 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-arena-muted">
                  <TrophyIcon className="h-3 w-3 text-accent" />
                  <span className="truncate">
                    {market ? marketTitle(market, t) : t("match.noMarkets")}
                  </span>
                </div>
                {market ? (
                  <div className="grid grid-cols-2 gap-2">
                    {market.selections.map((selection) => {
                      const selected = selectedFor(match.id);
                      return (
                        <OddsButton
                          key={selection.key}
                          market={market}
                          selection={selection}
                          size="sm"
                          label={matchSelectionLabel(
                            match,
                            market,
                            selection.key,
                            t,
                          )}
                          selected={
                            selected?.marketId === market.id &&
                            selected.selectionKey === selection.key
                          }
                          onSelect={() => onSelect(match, market, selection)}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpen(match)}
                    className="text-[11px] font-semibold text-accent"
                  >
                    {t("match.openMarkets")}
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
