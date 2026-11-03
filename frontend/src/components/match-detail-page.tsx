"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TeamCrest } from "@/components/team-crest";
import { ApiError } from "@/lib/api";
import { cn, formatGameTime, formatMoney } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
import type { LobbyTeam } from "@/lib/lobby";
import type { MatchDetail, MatchPlayer } from "@/lib/match-detail";
import { getMatchDetail, useMatchStream } from "@/lib/match-detail";

function teamPlayers(players: MatchPlayer[], team: string) {
  return players
    .filter((player) => player.team?.toLowerCase() === team)
    .sort((a, b) => (b.netWorth ?? 0) - (a.netWorth ?? 0));
}

function netWorth(players: MatchPlayer[]) {
  return players.reduce((total, player) => total + (player.netWorth ?? 0), 0);
}

export function MatchDetailPage() {
  const { t, language } = useLanguage();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const matchId = Array.isArray(params.id) ? params.id[0] : params.id;
  const [initial, setInitial] = useState<MatchDetail | null>(null);
  const [error, setError] = useState("");
  const { detail, connected } = useMatchStream(matchId, initial);

  useEffect(() => {
    let active = true;
    getMatchDetail(matchId)
      .then((next) => {
        if (active) {
          setInitial(next);
        }
      })
      .catch((caught) => {
        if (active) {
          setError(
            caught instanceof ApiError && caught.status === 404
              ? t("detail.error")
              : t("detail.error"),
          );
        }
      });
    return () => {
      active = false;
    };
  }, [matchId, t]);

  const current = detail ?? initial;
  const radiantPlayers = useMemo(
    () => teamPlayers(current?.players ?? [], "radiant"),
    [current],
  );
  const direPlayers = useMemo(
    () => teamPlayers(current?.players ?? [], "dire"),
    [current],
  );

  const radiantTeam: LobbyTeam = {
    name: current?.match.radiant.name ?? t("detail.teamRadiant"),
    score: current?.match.radiant.score ?? 0,
    side: "radiant",
    teamId: current?.match.radiant.teamId,
  };
  const direTeam: LobbyTeam = {
    name: current?.match.dire.name ?? t("detail.teamDire"),
    score: current?.match.dire.score ?? 0,
    side: "dire",
    teamId: current?.match.dire.teamId,
  };
  const source = current?.match.source;
  const activityLabel =
    source === "GSI"
      ? current?.match.playersScope === "LOCAL"
        ? t("match.practice")
        : t("match.spectating")
      : t("match.live");
  const connectionLabel = connected
    ? source === "GSI"
      ? t("own.connected")
      : t("feed.live")
    : t("feed.offline");

  const renderTeam = (side: "radiant" | "dire", list: MatchPlayer[]) => {
    const team = side === "radiant" ? radiantTeam : direTeam;
    return (
      <div key={side}>
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <TeamCrest team={team} size="sm" />
            <h2 className="truncate text-xs font-bold uppercase tracking-[0.14em] text-arena-muted">
              {side === "radiant"
                ? t("detail.teamRadiant")
                : t("detail.teamDire")}
            </h2>
          </div>
          <span className="font-score text-xs font-semibold tabular-nums text-arena-ink">
            {formatMoney(netWorth(list), language)}
          </span>
        </div>
        <ul className="mt-2 space-y-1.5">
          {list.map((player, index) => (
            <li
              key={`${side}-${player.accountId ?? index}`}
              className="flex items-center justify-between gap-2 rounded-lg border border-arena-line bg-arena-raised/45 px-2.5 py-1.5"
            >
              <span className="truncate text-xs font-semibold text-arena-ink">
                {player.name || t("detail.anonymous")}
              </span>
              <span className="shrink-0 font-mono text-[11px] text-arena-muted">
                {player.kills ?? 0}/{player.deaths ?? 0}/{player.assists ?? 0}
              </span>
              <span className="w-16 shrink-0 text-right font-score text-[11px] font-semibold tabular-nums text-arena-ink">
                {formatMoney(player.netWorth ?? 0, language)}
              </span>
            </li>
          ))}
          {list.length === 0 ? (
            <li className="text-xs text-arena-muted">{t("detail.noPlayers")}</li>
          ) : null}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-arena text-arena-ink">
      <SiteHeader
        game="dota2"
        activeView="live"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => router.push("/")}
        onRegister={() => router.push("/")}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-arena-muted transition hover:text-arena-ink"
        >
          <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
          {t("detail.back")}
        </Link>

        {error ? (
          <p className="mt-6 rounded-2xl border border-arena-line bg-arena-surface p-6 text-sm text-arena-muted">
            {error}
          </p>
        ) : !current ? (
          <p className="mt-6 text-sm text-arena-muted">{t("detail.loading")}</p>
        ) : (
          <>
            <section className="relative mt-4 overflow-hidden rounded-3xl border border-white/10 bg-arena-surface shadow-arena">
              <div className="arena-grid absolute inset-0 opacity-60" />
              <div className="arena-glow absolute inset-0" />
              <div className="relative p-5 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
                      {current.match.tournament || t("match.gsi")}
                    </p>
                    <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-arena-ink">
                      {current.match.radiant.name} vs {current.match.dire.name}
                    </h1>
                    <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-arena-muted">
                      <span>{activityLabel}</span>
                      <span aria-hidden="true">·</span>
                      <span>{formatGameTime(current.match.durationSeconds)}</span>
                      <span aria-hidden="true">·</span>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 font-semibold",
                          connected ? "text-emerald-300" : "text-arena-muted",
                        )}
                      >
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full",
                            connected ? "bg-emerald-400" : "bg-arena-muted/50",
                          )}
                        />
                        {connectionLabel}
                      </span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-score text-4xl font-semibold leading-none tabular-nums text-arena-ink sm:text-5xl">
                      {current.match.radiant.score}
                      <span className="mx-1.5 text-arena-muted/35">:</span>
                      {current.match.dire.score}
                    </p>
                    {current.match.paused ? (
                      <p className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-amber-300">
                        {t("match.paused")}
                      </p>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-2xl border border-arena-line bg-arena/40 p-3 sm:p-4">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <TeamCrest team={radiantTeam} size="md" />
                    <span className="truncate text-xs font-semibold text-arena-ink">
                      {radiantTeam.name}
                    </span>
                  </div>
                  <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-arena-muted">
                    vs
                  </span>
                  <div className="flex min-w-0 items-center justify-end gap-2.5">
                    <span className="truncate text-right text-xs font-semibold text-arena-ink">
                      {direTeam.name}
                    </span>
                    <TeamCrest team={direTeam} size="md" />
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-4 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-arena-line bg-arena-surface p-4 sm:p-5">
                {renderTeam("radiant", radiantPlayers)}
              </div>
              <div className="rounded-2xl border border-arena-line bg-arena-surface p-4 sm:p-5">
                {renderTeam("dire", direPlayers)}
              </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-2xl border border-arena-line bg-arena-surface p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-arena-muted">
                  {t("detail.events")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {current.events
                    .slice()
                    .reverse()
                    .map((event) => (
                      <li
                        key={event.id}
                        className="flex items-center justify-between gap-3 border-b border-arena-line pb-2 text-xs last:border-0"
                      >
                        <span className="font-semibold text-arena-ink">
                          {t(`event.${event.type}` as TranslationKey)}
                        </span>
                        <span className="text-arena-muted">
                          {formatGameTime(event.clockTime)}
                          {event.team
                            ? ` · ${event.team === "radiant" ? t("detail.teamRadiant") : t("detail.teamDire")}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  {current.events.length === 0 ? (
                    <li className="text-xs text-arena-muted">
                      {t("detail.noEvents")}
                    </li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-2xl border border-arena-line bg-arena-surface p-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-arena-muted">
                  {t("detail.roshan")}
                </h2>
                <p className="mt-2 text-sm font-semibold text-arena-ink">
                  {current.roshan
                    ? current.roshan.alive
                      ? t("detail.roshanAlive")
                      : t("detail.roshanDead")
                    : t("detail.roshanUnavailable")}
                </p>
                {current.roshan?.phaseTimeRemaining ? (
                  <p className="mt-1 text-xs text-arena-muted">
                    {t("detail.roshanTimer", {
                      seconds: Math.round(current.roshan.phaseTimeRemaining),
                    })}
                  </p>
                ) : null}
                <p className="mt-4 text-xs leading-5 text-arena-muted">
                  {t("detail.betHint")}
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter variant="dark" />
    </div>
  );
}
