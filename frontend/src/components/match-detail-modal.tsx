"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CloseIcon, LockIcon, PlayIcon, TrophyIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
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
  type Market,
  type Selection,
} from "@/lib/markets";

type MatchDetailModalProps = {
  match: LobbyMatch;
  markets?: Market[];
  onClose: () => void;
  onSelect: (match: LobbyMatch, market: Market, selection: Selection) => void;
};

function TeamPanel({
  team,
  align,
  finished,
}: {
  team: LobbyTeam;
  align: "left" | "right";
  finished: boolean;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-2",
        align === "right" ? "items-end text-right" : "items-start text-left",
      )}
    >
      <TeamCrest team={team} size="lg" />
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            finished && team.winner === false
              ? "text-arena-muted"
              : "text-arena-ink",
          )}
        >
          {team.name}
        </p>
        <p
          className={cn(
            "mt-0.5 flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-arena-muted",
            align === "right" && "justify-end",
          )}
        >
          {align === "right" ? null : (
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                team.side === "radiant" ? "bg-radiant" : "bg-dire",
              )}
            />
          )}
          {team.side === "radiant" ? "Radiant" : "Dire"}
          {finished && team.winner ? (
            <TrophyIcon className="h-3 w-3 text-accent" />
          ) : null}
        </p>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-arena-line bg-arena-raised/45 p-3">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-arena-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-arena-ink">
        {value}
      </p>
    </div>
  );
}

export function MatchDetailModal({
  match,
  markets = [],
  onClose,
  onSelect,
}: MatchDetailModalProps) {
  const { t, language } = useLanguage();
  const [tab, setTab] = useState<"summary" | "markets">("summary");
  const finished = match.state === "finished";
  const tournament = matchTournamentLabel(match, t);
  const source = matchSourceLabel(match, t);
  const winnerName = match.radiant.winner
    ? match.radiant.name
    : match.dire.name;

  useEffect(() => {
    setTab("summary");
  }, [match.id]);

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="match-title"
      panelClassName="sm:max-w-2xl"
      variant="dark"
    >
      <div className="border-b border-arena-line bg-arena-soft px-5 py-4 sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
              {tournament}
            </p>
            <h2
              id="match-title"
              className="mt-1 truncate font-display text-lg font-semibold tracking-tight text-arena-ink"
            >
              {match.radiant.name} vs {match.dire.name}
            </h2>
            <p className="mt-1 text-xs text-arena-muted">
              {match.format ? `${match.format} · ` : ""}
              {finished
                ? t("match.final")
                : match.paused
                  ? t("match.paused")
                  : t("match.live")}
              {source ? ` · ${source}` : ""}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {match.stream ? (
              <Link
                href={`/match/${match.id}#stream`}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-accent transition hover:bg-accent/10"
              >
                <PlayIcon className="h-3.5 w-3.5" />
                {t("match.watchStream")}
              </Link>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              aria-label={t("match.close")}
              className="grid h-9 w-9 place-items-center rounded-lg text-arena-muted transition hover:bg-white/5 hover:text-arena-ink"
            >
              <CloseIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-arena-line px-5 py-5 sm:px-6">
        <TeamPanel team={match.radiant} align="left" finished={finished} />
        <div className="text-center">
          <p className="font-score text-3xl font-semibold leading-none tabular-nums text-arena-ink">
            {match.radiant.score}
            <span className="mx-1 text-arena-muted/40">:</span>
            {match.dire.score}
          </p>
          <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-arena-muted">
            {finished
              ? formatDuration(match.durationSeconds)
              : formatGameTime(match.durationSeconds)}
          </p>
        </div>
        <TeamPanel team={match.dire} align="right" finished={finished} />
      </div>

      <div className="flex gap-1 border-b border-arena-line px-5 sm:px-6">
        {(
          [
            { id: "summary", label: t("match.summary") },
            { id: "markets", label: t("match.markets") },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={cn(
              "border-b-2 px-3 py-3 text-sm font-semibold transition",
              tab === item.id
                ? "border-accent text-arena-ink"
                : "border-transparent text-arena-muted hover:text-arena-ink",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "summary" ? (
        <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-4 sm:p-6">
          {finished ? (
            <>
              <Stat
                label={t("match.duration")}
                value={formatDuration(match.durationSeconds)}
              />
              <Stat
                label={t("match.started")}
                value={formatStartTime(match.startedAt, language)}
              />
              <Stat label={t("match.winner")} value={winnerName} />
              <Stat
                label={t("match.format")}
                value={match.format || "—"}
              />
            </>
          ) : (
            <>
              <Stat
                label={t("match.gameTime")}
                value={formatGameTime(match.durationSeconds)}
              />
              <Stat
                label={t("match.mmrLabel")}
                value={
                  match.averageMmr
                    ? formatNumber(match.averageMmr, language)
                    : "—"
                }
              />
              <Stat
                label={t("match.spectatorsLabel")}
                value={
                  match.spectators
                    ? formatNumber(match.spectators, language)
                    : "—"
                }
              />
              <Stat
                label={t("match.delayLabel")}
                value={
                  match.delaySeconds ? `${match.delaySeconds}s` : "—"
                }
              />
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4 p-5 sm:p-6">
          {markets.length > 0 ? (
            <>
              {markets.map((market) => {
                const suspensionLabel =
                  market.suspensionReason === "FEED_STALE"
                    ? t("market.reason.FEED_STALE")
                    : market.suspensionReason === "FEED_DOWN"
                      ? t("market.reason.FEED_DOWN")
                      : market.suspensionReason === "MATCH_LEFT_LIVE"
                        ? t("market.reason.MATCH_LEFT_LIVE")
                        : null;
                const statusLabel =
                  market.status === "OPEN"
                    ? t("market.open")
                    : market.status === "SUSPENDED"
                      ? t("market.suspended")
                      : t("market.closed");

                return (
                  <section
                    key={market.id}
                    className="rounded-xl border border-arena-line bg-arena-raised/40 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-arena-ink">
                          {marketTitle(market, t)}
                        </p>
                        <p className="mt-1 text-[11px] text-arena-muted">
                          {t("market.version", { version: market.version })}
                          {market.line != null
                            ? ` · ${t("market.line", { line: Number(market.line).toFixed(1) })}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ring-1",
                          market.status === "OPEN"
                            ? "bg-emerald-500/10 text-emerald-300 ring-emerald-400/25"
                            : market.status === "SUSPENDED"
                              ? "bg-amber-400/10 text-amber-300 ring-amber-400/25"
                              : "bg-white/5 text-arena-muted ring-arena-line",
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {market.status !== "OPEN" ? (
                      <p className="mt-3 rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs font-medium text-amber-200">
                        {suspensionLabel ?? t("market.suspended")}
                      </p>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {market.selections.map((selection) => (
                        <OddsButton
                          key={selection.key}
                          market={market}
                          selection={selection}
                          label={matchSelectionLabel(match, market, selection.key, t)}
                          onSelect={() => onSelect(match, market, selection)}
                        />
                      ))}
                    </div>
                  </section>
                );
              })}

              <p className="text-[11px] leading-4 text-arena-muted">
                {t("market.oddsNote")}
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-arena-line bg-arena-raised text-arena-muted">
                <LockIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-arena-ink">
                {t("match.marketsEmptyTitle")}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-arena-muted">
                {t("match.marketsEmptyBody")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-lg border border-arena-line px-4 py-2.5 text-sm font-semibold text-arena-ink transition hover:bg-white/5"
              >
                {t("match.close")}
              </button>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
