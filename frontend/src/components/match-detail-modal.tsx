"use client";

import { useEffect, useState } from "react";
import { CloseIcon, LockIcon, TrophyIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import {
  cn,
  formatDuration,
  formatGameTime,
  formatNumber,
  formatOdds,
  formatStartTime,
  getInitials,
} from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyMatch, LobbyTeam } from "@/lib/lobby";
import {
  marketTitle,
  selectionLabel,
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
      <span
        className={cn(
          "grid h-11 w-11 place-items-center rounded-xl text-xs font-bold",
          team.side === "radiant"
            ? "bg-emerald-50 text-emerald-700"
            : "bg-rose-50 text-rose-700",
        )}
      >
        {getInitials(team.name)}
      </span>
      <div className="min-w-0">
        <p
          className={cn(
            "truncate text-sm font-semibold",
            finished && team.winner === false ? "text-muted" : "text-ink",
          )}
        >
          {team.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">
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
    <div className="rounded-xl border border-line bg-slate-50/70 p-3">
      <p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">
        {label}
      </p>
      <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
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
  const tournamentLabel =
    match.tournament ||
    (match.tournamentKind === "ranked" ? t("match.ranked") : t("match.pro"));
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
    >
      <div className="bg-navy px-5 py-4 text-white sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-semibold uppercase tracking-[0.18em] text-accent">
              {tournamentLabel}
            </p>
            <h2
              id="match-title"
              className="mt-1 truncate font-display text-lg font-semibold tracking-tight"
            >
              {match.radiant.name} vs {match.dire.name}
            </h2>
            <p className="mt-1 text-xs text-white/50">
              {match.format ? `${match.format} · ` : ""}
              {finished ? t("match.final") : t("match.live")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("match.close")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-line px-5 py-5 sm:px-6">
        <TeamPanel team={match.radiant} align="left" finished={finished} />
        <div className="text-center">
          <p className="font-score text-3xl font-semibold leading-none text-ink">
            {match.radiant.score}
            <span className="mx-1 text-muted/40">:</span>
            {match.dire.score}
          </p>
          <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
            {finished
              ? formatDuration(match.durationSeconds)
              : formatGameTime(match.durationSeconds)}
          </p>
        </div>
        <TeamPanel team={match.dire} align="right" finished={finished} />
      </div>

      <div className="flex gap-1 border-b border-line px-5 sm:px-6">
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
                ? "border-accent text-ink"
                : "border-transparent text-muted hover:text-ink",
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
                    className="rounded-xl border border-line bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-ink">
                          {marketTitle(market, t)}
                        </p>
                        <p className="mt-1 text-[11px] text-muted">
                          {t("market.version", { version: market.version })}
                          {market.line != null
                            ? ` · ${t("market.line", { line: Number(market.line).toFixed(1) })}`
                            : ""}
                        </p>
                      </div>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide ring-1",
                          market.status === "OPEN"
                            ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                            : market.status === "SUSPENDED"
                              ? "bg-amber-50 text-amber-700 ring-amber-200"
                              : "bg-slate-50 text-slate-500 ring-line",
                        )}
                      >
                        {statusLabel}
                      </span>
                    </div>

                    {market.status !== "OPEN" ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                        {suspensionLabel ?? t("market.suspended")}
                      </p>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      {market.selections.map((selection) => (
                        <button
                          key={selection.key}
                          type="button"
                          disabled={market.status !== "OPEN"}
                          onClick={() => onSelect(match, market, selection)}
                          className={cn(
                            "rounded-lg border px-3 py-2.5 text-left transition",
                            market.status === "OPEN"
                              ? "border-line bg-white hover:border-accent/40 hover:bg-accent/5"
                              : "cursor-not-allowed border-line bg-slate-50/70 opacity-70",
                          )}
                        >
                          <span className="block truncate text-[10px] font-semibold text-muted">
                            {selectionLabel(market, selection.key, t)}
                          </span>
                          <span className="mt-1 block font-score text-xl font-semibold text-ink">
                            {formatOdds(selection.odds)}
                          </span>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}

              <p className="text-[10px] leading-4 text-muted">
                {t("market.demoNote")}
              </p>
            </>
          ) : (
            <div className="py-6 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-line">
                <LockIcon className="h-6 w-6" />
              </span>
              <h3 className="mt-4 text-sm font-semibold text-ink">
                {t("match.marketsEmptyTitle")}
              </h3>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                {t("match.marketsEmptyBody")}
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-5 rounded-lg border border-line px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-slate-50"
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
