"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { BetSlip } from "@/components/bet-slip";
import { FilterRail } from "@/components/filter-rail";
import { LiveTicker } from "@/components/live-ticker";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { MatchCard } from "@/components/match-card";
import { MatchDetailModal } from "@/components/match-detail-modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TicketIcon, TrophyIcon } from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { cn, formatNumber } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useLobbyFeed } from "@/lib/live";
import type {
  GameId,
  LobbyData,
  LobbyMatch,
  LobbyView,
} from "@/lib/lobby";
import { indexMarkets, type LiveMarketsData } from "@/lib/markets";

type HomeLobbyProps = {
  data: LobbyData;
  markets: LiveMarketsData;
};

export function HomeLobby({ data: initialData, markets: initialMarkets }: HomeLobbyProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data, markets, connected } = useLobbyFeed(initialData, initialMarkets);
  const [game, setGame] = useState<GameId>("dota2");
  const [view, setView] = useState<LobbyView>("all");
  const [tournament, setTournament] = useState("all");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const allMatches = useMemo(
    () => [...data.live, ...data.recent],
    [data.live, data.recent],
  );
  const liveMatches = data.live;
  const resultCount = data.recent.length;
  const marketByMatchId = useMemo(() => indexMarkets(markets), [markets]);
  const tournaments = useMemo(
    () =>
      Array.from(
        new Set(
          allMatches
            .map((match) => match.tournament)
            .filter((name): name is string => Boolean(name)),
        ),
      ).sort((a, b) => a.localeCompare(b)),
    [allMatches],
  );

  const filteredMatches = useMemo(
    () =>
      allMatches.filter((match) => {
        const matchesView =
          view === "all" ||
          (view === "live" && match.state === "live") ||
          (view === "results" && match.state === "finished");
        const matchesTournament =
          tournament === "all" || match.tournament === tournament;
        return matchesView && matchesTournament;
      }),
    [allMatches, tournament, view],
  );

  const selectedMatch =
    allMatches.find((match) => match.id === selectedId) ?? null;

  const title =
    view === "results"
      ? t("lobby.titleResults")
      : view === "upcoming"
        ? t("lobby.titleUpcoming")
        : view === "live"
          ? t("lobby.titleLive")
          : t("lobby.titleAll");

  const scrollToMatches = () => {
    document
      .getElementById("matches")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavigate = (nextView: LobbyView) => {
    setView(nextView);
    setTournament("all");
    scrollToMatches();
  };

  const handleClear = () => {
    setView("all");
    setTournament("all");
  };

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handleOpenMatch = (match: LobbyMatch) => {
    setSelectedId(match.id);
  };

  const mobileViews: Array<{ id: LobbyView; label: string }> = [
    { id: "all", label: t("state.all") },
    { id: "live", label: t("state.live") },
    { id: "results", label: t("state.results") },
    { id: "upcoming", label: t("state.upcoming") },
  ];

  const feedStatus = data.feed?.status ?? "STARTING";
  const feedOk = connected && feedStatus === "LIVE";
  const feedLabel = !connected
    ? t("feed.reconnecting")
    : feedStatus === "DOWN"
      ? t("feed.down")
      : feedStatus === "STALE"
        ? t("feed.stale")
        : feedStatus === "DEGRADED"
          ? t("feed.degraded")
          : feedStatus === "STARTING"
            ? t("feed.starting")
            : t("feed.live");

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        game={game}
        activeView={view}
        onGameChange={setGame}
        onNavigate={handleNavigate}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />
      <LiveTicker
        matches={liveMatches}
        updatedAt={data.updatedAt}
        onOpen={handleOpenMatch}
      />

      <main className="mx-auto max-w-[1320px] px-4 pb-10 pt-6 sm:px-6 lg:px-8 lg:pb-12">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-accent-strong">
              {t("lobby.eyebrow")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {title}
            </h1>
            <p className="mt-1 text-sm text-muted">{t("lobby.subtitle")}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-live/20 bg-live/5 px-2.5 py-1 text-[11px] font-semibold text-live">
              <span className="live-dot live-dot-sm" />
              {t("lobby.liveCount", {
                count: formatNumber(liveMatches.length, language),
              })}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted">
              <TrophyIcon className="h-3 w-3" />
              {t("lobby.resultsCount", {
                count: formatNumber(resultCount, language),
              })}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
                feedOk
                  ? "border-live/20 bg-live/5 text-live"
                  : "border-amber-200 bg-amber-50 text-amber-700",
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  feedOk ? "bg-live" : "bg-amber-500",
                )}
              />
              {feedLabel}
            </span>
          </div>
        </div>

        <div className="mt-6 grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)_320px]">
          <div className="hidden lg:block">
            <FilterRail
              view={view}
              onViewChange={setView}
              tournament={tournament}
              onTournamentChange={setTournament}
              tournaments={tournaments}
              liveCount={liveMatches.length}
              resultCount={resultCount}
              visibleCount={filteredMatches.length}
              onClear={handleClear}
            />
          </div>

          <section id="matches" className="min-w-0 scroll-mt-20">
            <div className="scrollbar-none mb-3 flex gap-2 overflow-x-auto lg:hidden">
              {mobileViews.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  aria-pressed={view === item.id}
                  className={cn(
                    "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition",
                    view === item.id
                      ? "border-navy bg-navy text-white"
                      : "border-line bg-surface text-muted hover:border-slate-300 hover:text-ink",
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="mb-3 lg:hidden">
              <label className="sr-only" htmlFor="tournament-filter">
                {t("filters.tournament")}
              </label>
              <select
                id="tournament-filter"
                value={tournament}
                onChange={(event) => setTournament(event.target.value)}
                className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm font-medium text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
              >
                <option value="all">{t("filters.allTournaments")}</option>
                {tournaments.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
              <p className="text-xs font-medium text-muted">
                {t("filters.showing", {
                  count: formatNumber(filteredMatches.length, language),
                })}
              </p>
              <button
                type="button"
                onClick={handleClear}
                disabled={view === "all" && tournament === "all"}
                className="text-[11px] font-semibold text-accent-strong transition hover:text-accent disabled:cursor-not-allowed disabled:text-muted/40"
              >
                {t("filters.clear")}
              </button>
            </div>

            <div className="space-y-3">
              {filteredMatches.map((match) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  market={marketByMatchId.get(match.id)}
                  onOpen={handleOpenMatch}
                />
              ))}

              {filteredMatches.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-line bg-surface px-6 py-12 text-center shadow-card">
                  <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-line">
                    <TrophyIcon className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-sm font-semibold text-ink">
                    {t("empty.title")}
                  </h2>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-muted">
                    {t("empty.body")}
                  </p>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="mt-5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-strong"
                  >
                    {t("empty.action")}
                  </button>
                </div>
              ) : null}
            </div>
          </section>

          <BetSlip
            onLogin={() => openLogin("login")}
            onExplore={scrollToMatches}
          />
        </div>
      </main>

      <SiteFooter />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/10 text-accent-strong">
            <TicketIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-ink">{t("bet.title")}</p>
            <p className="truncate text-[11px] text-muted">
              {t("bet.emptyBody")}
            </p>
          </div>
          {user ? (
            <Link
              href="/wallet"
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {t("header.wallet")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition hover:bg-accent-strong"
            >
              {t("bet.login")}
            </button>
          )}
        </div>
      </div>

      {loginOpen ? (
        <LoginModal
          open
          mode={loginMode}
          onModeChange={setLoginMode}
          onClose={() => setLoginOpen(false)}
        />
      ) : null}

      {selectedMatch ? (
        <MatchDetailModal
          match={selectedMatch}
          market={marketByMatchId.get(selectedMatch.id)}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </div>
  );
}
