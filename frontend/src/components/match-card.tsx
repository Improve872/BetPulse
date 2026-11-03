"use client";

import Link from "next/link";
import {
  ArrowRightIcon,
  ClockIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import { OddsButton } from "@/components/odds-button";
import { TeamCrest } from "@/components/team-crest";
import {
  cn,
  formatDuration,
  formatGameTime,
  formatNumber,
  formatStartTime,
} from "@/lib/format";
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

type MatchCardProps = {
  match: LobbyMatch;
  markets?: Market[];
  onOpen: (match: LobbyMatch) => void;
  onSelect: (match: LobbyMatch, market: Market, selection: Selection) => void;
  selected?: { marketId: string; selectionKey: string } | null;
  index?: number;
};

function TeamRow({
  team,
  finished,
}: {
  team: LobbyTeam;
  finished: boolean;
}) {
  const isLoser = finished && team.winner === false;

  return (
    <div className="flex items-center gap-3">
      <TeamCrest team={team} size="md" />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            isLoser ? "text-arena-muted" : "text-arena-ink",
          )}
        >
          {team.name}
        </p>
      </div>
      {finished && team.winner ? (
        <TrophyIcon className="h-4 w-4 shrink-0 text-accent" />
      ) : null}
    </div>
  );
}

export function MatchCard({
  match,
  markets = [],
  onOpen,
  onSelect,
  selected,
  index = 0,
}: MatchCardProps) {
  const { t, language } = useLanguage();
  const finished = match.state === "finished";
  const market = primaryMarket(markets);
  const tournament = matchTournamentLabel(match, t);
  const source = matchSourceLabel(match, t);

  return (
    <article
      className="card-enter group overflow-hidden rounded-2xl border border-arena-line bg-arena-surface transition duration-200 hover:border-arena-muted/35 hover:bg-arena-raised/55"
      style={{ animationDelay: `${Math.min(index, 8) * 35}ms` }}
    >
      <div className="flex items-center justify-between gap-3 border-b border-arena-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-white/10 bg-white/5 text-[11px] font-bold text-arena-muted">
            D2
          </span>
          <span className="truncate text-xs font-medium text-arena-muted">
            {tournament}
          </span>
          {match.format ? (
            <span className="shrink-0 rounded border border-arena-line bg-white/5 px-1.5 py-0.5 text-[11px] font-semibold text-arena-muted">
              {match.format}
            </span>
          ) : null}
          {source ? (
            <span className="shrink-0 rounded border border-accent/25 bg-accent/5 px-1.5 py-0.5 text-[11px] font-semibold text-accent">
              {source}
            </span>
          ) : null}
          {match.source === "GSI" ? (
            <Link
              href={`/match/${match.id}`}
              className="shrink-0 text-[11px] font-semibold text-accent underline-offset-2 hover:underline"
            >
              {t("match.detail")}
            </Link>
          ) : null}
        </div>

        {match.state === "live" ? (
          <span
            className={cn(
              "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-bold uppercase tracking-[0.12em]",
              match.paused
                ? "bg-amber-400/10 text-amber-300"
                : "bg-live/10 text-live",
            )}
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                match.paused ? "bg-amber-400" : "live-dot live-dot-sm",
              )}
            />
            {match.paused ? t("match.paused") : t("match.live")}
            <span
              className={cn(
                "font-mono font-medium",
                match.paused ? "text-amber-300/80" : "text-live/80",
              )}
            >
              {formatGameTime(match.durationSeconds)}
            </span>
          </span>
        ) : (
          <span className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.12em] text-arena-muted">
            {t("match.final")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-2.5">
        <div className="min-w-0 flex-1 space-y-2">
          <TeamRow team={match.radiant} finished={finished} />
          <TeamRow team={match.dire} finished={finished} />
        </div>
        <div className="flex flex-col items-end gap-1.5 border-l border-arena-line pl-4">
          <span
            className={cn(
              "font-score text-3xl font-semibold leading-none tabular-nums",
              finished && match.radiant.winner === false
                ? "text-arena-muted"
                : "text-arena-ink",
            )}
          >
            {match.radiant.score}
          </span>
          <span
            className={cn(
              "font-score text-3xl font-semibold leading-none tabular-nums",
              finished && match.dire.winner === false
                ? "text-arena-muted"
                : "text-arena-ink",
            )}
          >
            {match.dire.score}
          </span>
        </div>
      </div>

      <div className="border-t border-arena-line px-4 py-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2 text-xs text-arena-muted">
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white/5 text-accent ring-1 ring-arena-line">
              <TrophyIcon className="h-3 w-3" />
            </span>
            <span className="truncate">
              {market ? marketTitle(market, t) : t("match.market")}
            </span>
            {markets.length > 1 ? (
              <span className="shrink-0 text-[11px] font-semibold text-arena-muted">
                {t("market.moreMarkets", { count: markets.length })}
              </span>
            ) : null}
            {market?.status === "SUSPENDED" ? (
              <span className="shrink-0 rounded border border-amber-400/25 bg-amber-400/10 px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                {t("market.suspended")}
              </span>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onOpen(match)}
            className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs font-semibold text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
          >
            {t("match.openMarkets")}
            <ArrowRightIcon className="h-3.5 w-3.5" />
          </button>
        </div>

        {market ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {market.selections.map((selection) => (
              <OddsButton
                key={selection.key}
                market={market}
                selection={selection}
                label={matchSelectionLabel(match, market, selection.key, t)}
                selected={
                  selected?.marketId === market.id &&
                  selected.selectionKey === selection.key
                }
                onSelect={() =>
                  market.status === "OPEN"
                    ? onSelect(match, market, selection)
                    : onOpen(match)
                }
              />
            ))}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-arena-muted">
            {t("match.noMarkets")}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-arena-line px-4 py-1.5 text-[11px] font-medium text-arena-muted">
        {match.state === "live" ? (
          <>
            {match.averageMmr ? (
              <span>
                {t("match.mmr", {
                  mmr: formatNumber(match.averageMmr, language),
                })}
              </span>
            ) : null}
            {match.spectators ? (
              <span className="inline-flex items-center gap-1">
                <UsersIcon className="h-3 w-3" />
                {t("match.spectators", {
                  count: formatNumber(match.spectators, language),
                })}
              </span>
            ) : null}
            {match.delaySeconds ? (
              <span className="inline-flex items-center gap-1">
                <ClockIcon className="h-3 w-3" />
                {t("match.delay", { seconds: match.delaySeconds })}
              </span>
            ) : null}
          </>
        ) : (
          <>
            <span>{formatDuration(match.durationSeconds)}</span>
            <span>{formatStartTime(match.startedAt, language)}</span>
          </>
        )}
      </div>
    </article>
  );
}
