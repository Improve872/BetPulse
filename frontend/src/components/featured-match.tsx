"use client";

import { ArrowRightIcon, TrophyIcon } from "@/components/icons";
import { OddsButton } from "@/components/odds-button";
import { PulseMark } from "@/components/pulse-mark";
import { TeamCrest } from "@/components/team-crest";
import { cn, formatGameTime, formatNumber } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyMatch, LobbyTeam } from "@/lib/lobby";
import {
  matchSelectionLabel,
  matchSourceLabel,
  matchTournamentLabel,
} from "@/lib/match-labels";
import {
  marketTitle,
  primaryMarket,
  type Market,
  type Selection,
} from "@/lib/markets";

function TeamBlock({
  team,
  align,
  finished,
}: {
  team: LobbyTeam;
  align: "left" | "right";
  finished: boolean;
}) {
  const isLoser = finished && team.winner === false;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <TeamCrest team={team} size="lg" priority />
      <div className="min-w-0">
        <p
          className={cn(
            "max-w-[180px] truncate font-display text-lg font-semibold tracking-tight sm:text-xl",
            isLoser ? "text-arena-muted" : "text-arena-ink",
          )}
        >
          {team.name}
        </p>
        <p
          className={cn(
            "mt-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-arena-muted",
            align === "right" && "justify-end",
          )}
        >
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              team.side === "radiant" ? "bg-radiant" : "bg-dire",
            )}
          />
          {team.side === "radiant" ? "Radiant" : "Dire"}
          {finished && team.winner ? (
            <TrophyIcon className="h-3.5 w-3.5 text-accent" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

export function FeaturedMatch({
  match,
  markets = [],
  onOpen,
  onSelect,
  selected,
}: {
  match: LobbyMatch;
  markets?: Market[];
  onOpen: (match: LobbyMatch) => void;
  onSelect: (match: LobbyMatch, market: Market, selection: Selection) => void;
  selected?: { marketId: string; selectionKey: string } | null;
}) {
  const { t, language } = useLanguage();
  const finished = match.state === "finished";
  const market = primaryMarket(markets);
  const tournament = matchTournamentLabel(match, t);
  const source = matchSourceLabel(match, t);
  const label =
    match.source === "GSI" ? t("featured.own") : t("featured.label");

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-arena-surface shadow-arena">
      <div className="arena-grid absolute inset-0 opacity-70" />
      <div className="arena-glow absolute inset-0" />
      <PulseMark className="pointer-events-none absolute -right-10 top-1/2 h-72 w-72 -translate-y-1/2 text-white/[0.035]" />

      <div className="relative p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full border border-accent/35 bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-accent">
              {label}
            </span>
            <span className="truncate text-xs font-medium text-arena-muted">
              {tournament}
            </span>
            {match.format ? (
              <span className="rounded border border-arena-line bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold text-arena-muted">
                {match.format}
              </span>
            ) : null}
            {source ? (
              <span className="rounded border border-accent/25 bg-accent/5 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
                {source}
              </span>
            ) : null}
          </div>

          {match.state === "live" ? (
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.14em]",
                match.paused
                  ? "border-amber-400/25 bg-amber-400/10 text-amber-300"
                  : "border-live/25 bg-live/10 text-live",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  match.paused
                    ? "bg-amber-400"
                    : "live-dot live-dot-sm bg-live",
                )}
              />
              {match.paused ? t("match.paused") : t("match.live")}
              <span className="font-mono font-medium opacity-80">
                {formatGameTime(match.durationSeconds)}
              </span>
            </span>
          ) : (
            <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-arena-muted">
              {t("match.final")}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center gap-3 sm:gap-5">
          <TeamBlock team={match.radiant} align="left" finished={finished} />
          <div className="text-center">
            <p className="font-score text-4xl font-semibold leading-none tabular-nums text-arena-ink sm:text-5xl">
              {match.radiant.score}
              <span className="mx-1.5 text-arena-muted/35 sm:mx-2">:</span>
              {match.dire.score}
            </p>
            {match.averageMmr ? (
              <p className="mt-2 text-[11px] text-arena-muted">
                {t("match.mmr", {
                  mmr: formatNumber(match.averageMmr, language),
                })}
              </p>
            ) : null}
          </div>
          <TeamBlock team={match.dire} align="right" finished={finished} />
        </div>

        <div className="mt-4 rounded-2xl border border-arena-line bg-arena/45 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="flex items-center gap-2 text-xs font-semibold text-arena-muted">
              <TrophyIcon className="h-3.5 w-3.5 text-accent" />
              {market ? marketTitle(market, t) : t("match.market")}
            </p>
            <button
              type="button"
              onClick={() => onOpen(match)}
              className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
            >
              {t("match.openMarkets")}
              <ArrowRightIcon className="h-3.5 w-3.5" />
            </button>
          </div>

          {market ? (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {market.selections.map((selection) => (
                <OddsButton
                  key={selection.key}
                  market={market}
                  selection={selection}
                  size="lg"
                  label={matchSelectionLabel(match, market, selection.key, t)}
                  selected={
                    selected?.marketId === market.id &&
                    selected.selectionKey === selection.key
                  }
                  onSelect={() => onSelect(match, market, selection)}
                />
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-arena-muted">
              {t("match.noMarkets")}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
