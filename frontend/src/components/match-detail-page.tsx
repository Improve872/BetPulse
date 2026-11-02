"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError } from "@/lib/api";
import { formatGameTime, formatMoney } from "@/lib/format";
import { useLanguage, type TranslationKey } from "@/lib/i18n";
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

  const renderTeam = (side: "radiant" | "dire", list: MatchPlayer[]) => (
    <div key={side}>
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
          {side === "radiant" ? t("detail.teamRadiant") : t("detail.teamDire")}
        </h2>
        <span className="font-score text-xs font-semibold text-ink">
          {formatMoney(netWorth(list), language)}
        </span>
      </div>
      <ul className="mt-2 space-y-1.5">
        {list.map((player, index) => (
          <li
            key={`${side}-${player.accountId ?? index}`}
            className="flex items-center justify-between gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5"
          >
            <span className="truncate text-xs font-semibold text-ink">
              {player.name || t("detail.anonymous")}
            </span>
            <span className="shrink-0 font-mono text-[11px] text-muted">
              {player.kills ?? 0}/{player.deaths ?? 0}/{player.assists ?? 0}
            </span>
            <span className="w-16 shrink-0 text-right font-score text-[11px] font-semibold text-ink">
              {formatMoney(player.netWorth ?? 0, language)}
            </span>
          </li>
        ))}
        {list.length === 0 ? (
          <li className="text-xs text-muted">{t("detail.noPlayers")}</li>
        ) : null}
      </ul>
    </div>
  );

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        game="dota2"
        activeView="all"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => router.push("/")}
        onRegister={() => router.push("/")}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-muted transition hover:text-ink"
        >
          <ArrowRightIcon className="h-3.5 w-3.5 rotate-180" />
          {t("detail.back")}
        </Link>

        {error ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
            {error}
          </p>
        ) : !current ? (
          <p className="mt-6 text-sm text-muted">{t("detail.loading")}</p>
        ) : (
          <>
            <section className="mt-4 overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
                    {current.match.tournament || t("match.gsi")}
                  </p>
                  <h1 className="mt-1 font-display text-xl font-semibold tracking-tight text-ink">
                    {current.match.radiant.name} vs {current.match.dire.name}
                  </h1>
                  <p className="mt-1 text-xs text-muted">
                    {current.match.playersScope === "LOCAL"
                      ? t("match.practice")
                      : t("match.spectating")}{" "}
                    · {formatGameTime(current.match.durationSeconds)} ·{" "}
                    {connected ? t("own.connected") : t("own.disconnected")}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-score text-3xl font-semibold text-ink">
                    {current.match.radiant.score}
                    <span className="mx-1 text-muted/40">:</span>
                    {current.match.dire.score}
                  </p>
                  {current.match.paused ? (
                    <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                      {t("match.paused")}
                    </p>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-4 p-5 sm:grid-cols-2">
                {renderTeam("radiant", radiantPlayers)}
                {renderTeam("dire", direPlayers)}
              </div>
            </section>

            <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
              <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {t("detail.events")}
                </h2>
                <ul className="mt-3 space-y-2">
                  {current.events
                    .slice()
                    .reverse()
                    .map((event) => (
                      <li
                        key={event.id}
                        className="flex items-center justify-between gap-3 border-b border-line pb-2 text-xs last:border-0"
                      >
                        <span className="font-semibold text-ink">
                          {t(`event.${event.type}` as TranslationKey)}
                        </span>
                        <span className="text-muted">
                          {formatGameTime(event.clockTime)}
                          {event.team
                            ? ` · ${event.team === "radiant" ? t("detail.teamRadiant") : t("detail.teamDire")}`
                            : ""}
                        </span>
                      </li>
                    ))}
                  {current.events.length === 0 ? (
                    <li className="text-xs text-muted">{t("detail.noEvents")}</li>
                  ) : null}
                </ul>
              </div>

              <div className="rounded-2xl border border-line bg-surface p-5 shadow-card">
                <h2 className="text-xs font-bold uppercase tracking-[0.14em] text-muted">
                  {t("detail.roshan")}
                </h2>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {current.roshan
                    ? current.roshan.alive
                      ? t("detail.roshanAlive")
                      : t("detail.roshanDead")
                    : t("detail.roshanUnavailable")}
                </p>
                {current.roshan?.phaseTimeRemaining ? (
                  <p className="mt-1 text-xs text-muted">
                    {t("detail.roshanTimer", {
                      seconds: Math.round(current.roshan.phaseTimeRemaining),
                    })}
                  </p>
                ) : null}
                <p className="mt-4 text-xs leading-5 text-muted">
                  {t("detail.betHint")}
                </p>
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
