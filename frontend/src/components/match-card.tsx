"use client";

import {
  ArrowRightIcon,
  ClockIcon,
  TrophyIcon,
  UsersIcon,
} from "@/components/icons";
import {
  cn,
  formatDuration,
  formatGameTime,
  formatNumber,
  formatStartTime,
  getInitials,
} from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyMatch, LobbyTeam } from "@/lib/lobby";

type MatchCardProps = {
  match: LobbyMatch;
  onOpen: (match: LobbyMatch) => void;
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
    <div className="flex items-center gap-2.5">
      <span
        className={cn(
          "grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold",
          team.side === "radiant"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
        )}
      >
        {getInitials(team.name)}
      </span>
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            isLoser ? "text-muted" : "text-ink",
          )}
        >
          {team.name}
        </p>
        <p className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted/70">
          <span
            className={cn(
              "h-1.5 w-1.5 rounded-full",
              team.side === "radiant" ? "bg-radiant" : "bg-dire",
            )}
          />
          {team.side === "radiant" ? "Radiant" : "Dire"}
        </p>
      </div>
      {finished && team.winner ? (
        <TrophyIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
      ) : null}
    </div>
  );
}

export function MatchCard({ match, onOpen }: MatchCardProps) {
  const { t, language } = useLanguage();
  const finished = match.state === "finished";
  const tournamentLabel =
    match.tournament ||
    (match.tournamentKind === "ranked" ? t("match.ranked") : t("match.pro"));

  return (
    <article className="group overflow-hidden rounded-2xl border border-line bg-surface shadow-card transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-card-hover">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-navy text-[9px] font-bold text-white">
            D2
          </span>
          <span className="truncate text-xs font-medium text-muted">
            {tournamentLabel}
          </span>
          {match.format ? (
            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
              {match.format}
            </span>
          ) : null}
        </div>

        {match.state === "live" ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-live/10 px-2 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-live">
            <span className="live-dot live-dot-sm" />
            {t("match.live")}
            <span className="font-mono font-medium text-live/70">
              {formatGameTime(match.durationSeconds)}
            </span>
          </span>
        ) : (
          <span className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">
            {t("match.final")}
          </span>
        )}
      </div>

      <div className="flex items-center gap-4 px-4 py-3">
        <div className="min-w-0 flex-1 space-y-2.5">
          <TeamRow team={match.radiant} finished={finished} />
          <TeamRow team={match.dire} finished={finished} />
        </div>
        <div className="flex flex-col items-end gap-2 border-l border-line pl-4">
          <span
            className={cn(
              "font-score text-2xl font-semibold leading-none",
              finished && match.radiant.winner === false
                ? "text-muted/60"
                : "text-ink",
            )}
          >
            {match.radiant.score}
          </span>
          <span
            className={cn(
              "font-score text-2xl font-semibold leading-none",
              finished && match.dire.winner === false
                ? "text-muted/60"
                : "text-ink",
            )}
          >
            {match.dire.score}
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-4 py-2 text-[10px] font-medium text-muted">
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

      <div className="flex items-center justify-between gap-3 border-t border-line bg-slate-50/70 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-2 text-xs text-muted">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-white text-accent ring-1 ring-line">
            <TrophyIcon className="h-3 w-3" />
          </span>
          <span className="truncate">{t("match.market")}</span>
          <span className="hidden shrink-0 rounded bg-white px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted ring-1 ring-line xl:inline">
            {t("match.noMarkets")}
          </span>
        </div>
        <button
          type="button"
          onClick={() => onOpen(match)}
          className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-accent/25 bg-accent/5 px-3 py-1.5 text-xs font-semibold text-accent-strong transition hover:border-accent/40 hover:bg-accent/10"
        >
          {t("match.open")}
          <ArrowRightIcon className="h-3.5 w-3.5" />
        </button>
      </div>
    </article>
  );
}
