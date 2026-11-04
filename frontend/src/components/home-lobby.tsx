"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BetSlip, type BetTarget } from "@/components/bet-slip";
import { FeaturedMatch } from "@/components/featured-match";
import { FilterRail } from "@/components/filter-rail";
import { LiveRail } from "@/components/live-rail";
import { LobbyTabs } from "@/components/lobby-tabs";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { MatchCard } from "@/components/match-card";
import { MatchDetailModal } from "@/components/match-detail-modal";
import { Modal } from "@/components/modal";
import { PulseMark } from "@/components/pulse-mark";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import {
  ArrowRightIcon,
  InfoIcon,
  TicketIcon,
} from "@/components/icons";
import { useAuth } from "@/lib/auth";
import { cn, formatNumber, formatOdds, formatUpdatedAt } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useLobbyFeed } from "@/lib/live";
import { matchSelectionLabel } from "@/lib/match-labels";
import type {
  GameId,
  LobbyData,
  LobbyMatch,
  LobbyView,
} from "@/lib/lobby";
import {
  indexMarkets,
  marketTitle,
  type LiveMarketsData,
  type Market,
  type Selection,
} from "@/lib/markets";

type HomeLobbyProps = {
  data: LobbyData;
  markets: LiveMarketsData;
};

type BetSelectionRef = {
  matchId: string;
  marketId: string;
  selectionKey: string;
};

function hasTeamIdentity(match: LobbyMatch) {
  return match.radiant.name !== "Radiant" && match.dire.name !== "Dire";
}

export function HomeLobby({ data: initialData, markets: initialMarkets }: HomeLobbyProps) {
  const { t, language } = useLanguage();
  const { user } = useAuth();
  const { data, markets, connection, retry } = useLobbyFeed(
    initialData,
    initialMarkets,
  );
  const [game, setGame] = useState<GameId>("dota2");
  const [view, setView] = useState<LobbyView>("live");
  const [tournament, setTournament] = useState("all");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [betSelection, setBetSelection] = useState<BetSelectionRef | null>(null);
  const [betPanelOpen, setBetPanelOpen] = useState(false);
  const [ownHelpOpen, setOwnHelpOpen] = useState(false);

  const allMatches = useMemo(
    () => [...data.live, ...data.recent],
    [data.live, data.recent],
  );
  const ownMatches = useMemo(
    () => data.live.filter((match) => match.source === "GSI"),
    [data.live],
  );
  const liveMatches = useMemo(
    () =>
      data.live
        .filter((match) => match.source !== "GSI")
        .slice()
        .sort((a, b) => {
          const identity = Number(hasTeamIdentity(b)) - Number(hasTeamIdentity(a));
          if (identity !== 0) {
            return identity;
          }
          const tournament = Number(Boolean(b.tournament)) - Number(Boolean(a.tournament));
          if (tournament !== 0) {
            return tournament;
          }
          return (
            (b.spectators ?? 0) - (a.spectators ?? 0) ||
            (b.averageMmr ?? 0) - (a.averageMmr ?? 0)
          );
        }),
    [data.live],
  );
  const resultCount = data.recent.length;
  const marketByMatchId = useMemo(() => indexMarkets(markets), [markets]);

  const betTarget = useMemo<BetTarget | null>(() => {
    if (!betSelection) {
      return null;
    }
    const match = allMatches.find(
      (candidate) => candidate.id === betSelection.matchId,
    );
    const market = marketByMatchId
      .get(betSelection.matchId)
      ?.find((candidate) => candidate.id === betSelection.marketId);
    const selection = market?.selections.find(
      (candidate) => candidate.key === betSelection.selectionKey,
    );
    return match && market && selection ? { match, market, selection } : null;
  }, [allMatches, betSelection, marketByMatchId]);

  useEffect(() => {
    if (betSelection && !betTarget) {
      setBetSelection(null);
      setBetPanelOpen(false);
    }
  }, [betSelection, betTarget]);

  const tournaments = useMemo(() => {
    const counts = new Map<string, number>();
    const matches = view === "results" ? data.recent : liveMatches;
    for (const match of matches) {
      const name = match.tournament?.trim();
      if (!name) {
        continue;
      }
      counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return Array.from(counts, ([name, count]) => ({ name, count })).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }, [data.recent, liveMatches, view]);

  const featuredMatch = useMemo(() => {
    if (view !== "live") {
      return null;
    }
    const candidates = [...ownMatches, ...liveMatches].filter(
      (match) => tournament === "all" || match.tournament === tournament,
    );
    const hasMarket = (match: LobbyMatch) =>
      (marketByMatchId.get(match.id)?.length ?? 0) > 0;

    return (
      candidates.find((match) => match.source === "GSI") ??
      candidates.find(
        (match) =>
          hasTeamIdentity(match) && match.tournament && hasMarket(match),
      ) ??
      candidates.find(
        (match) => hasTeamIdentity(match) && match.tournament,
      ) ??
      candidates.find(hasTeamIdentity) ??
      candidates[0] ??
      null
    );
  }, [liveMatches, marketByMatchId, ownMatches, tournament, view]);

  const filteredMatches = useMemo(() => {
    const base = view === "results" ? data.recent : liveMatches;
    return base
      .filter((match) => tournament === "all" || match.tournament === tournament)
      .filter((match) => match.id !== featuredMatch?.id);
  }, [data.recent, featuredMatch?.id, liveMatches, tournament, view]);

  const selectedMatch =
    allMatches.find((match) => match.id === selectedId) ?? null;

  const title =
    view === "results" ? t("lobby.titleResults") : t("lobby.titleLive");
  const subtitle =
    view === "results" ? t("lobby.subtitleResults") : t("lobby.subtitleLive");

  const feedStatus = data.feed?.status ?? "STARTING";
  const feedOffline =
    connection === "disconnected" || feedStatus === "DOWN";
  const feedLabel =
    connection === "connecting"
      ? t("feed.connecting")
      : feedOffline
        ? t("feed.offline")
        : feedStatus === "STARTING"
          ? t("feed.starting")
          : feedStatus === "LIVE"
            ? t("feed.live")
            : t("feed.updating");
  const feedTone = feedOffline
    ? "border-red-400/25 bg-red-500/10 text-red-200"
    : connection === "connecting" ||
        feedStatus === "STARTING" ||
        feedStatus === "DEGRADED" ||
        feedStatus === "STALE"
      ? "border-amber-400/25 bg-amber-400/10 text-amber-200"
      : "border-live/25 bg-live/10 text-live";

  const emptyState = (() => {
    if (tournament !== "all") {
      return {
        title: t("empty.filterTitle"),
        body: t("empty.filterBody"),
        action: t("empty.clearFilter"),
        onAction: () => setTournament("all"),
      };
    }
    if (connection === "disconnected" && allMatches.length === 0) {
      return {
        title: t("empty.offlineTitle"),
        body: t("empty.offlineBody"),
        action: t("empty.retry"),
        onAction: retry,
      };
    }
    if (view === "live") {
      return {
        title: t("empty.liveTitle"),
        body: t("empty.liveBody"),
        action: t("empty.viewResults"),
        onAction: () => handleNavigate("results"),
      };
    }
    return {
      title: t("empty.resultsTitle"),
      body: t("empty.resultsBody"),
      action: t("empty.viewLive"),
      onAction: () => handleNavigate("live"),
    };
  })();

  const scrollToMatches = () => {
    document
      .getElementById("matches")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleNavigate = (nextView: LobbyView) => {
    setView(nextView === "results" ? "results" : "live");
    setTournament("all");
    scrollToMatches();
  };

  const handleClear = () => {
    setTournament("all");
  };

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const handleOpenMatch = (match: LobbyMatch) => {
    setSelectedId(match.id);
  };

  const handleSelect = (
    match: LobbyMatch,
    market: Market,
    selection: Selection,
  ) => {
    setBetSelection({
      matchId: match.id,
      marketId: market.id,
      selectionKey: selection.key,
    });
    setSelectedId(null);
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(max-width: 1023px)").matches
    ) {
      setBetPanelOpen(true);
    } else {
      document
        .getElementById("bet-slip")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleClearBet = () => {
    setBetSelection(null);
    setBetPanelOpen(false);
  };

  const handleExplore = () => {
    setBetPanelOpen(false);
    scrollToMatches();
  };

  const selectedFor = (matchId: string) =>
    betSelection?.matchId === matchId
      ? {
          marketId: betSelection.marketId,
          selectionKey: betSelection.selectionKey,
        }
      : null;

  const totalForView =
    view === "results"
      ? data.recent.length
      : liveMatches.length + ownMatches.length;
  const visibleForView =
    filteredMatches.length + (featuredMatch ? 1 : 0);
  const railMatches =
    view === "live"
      ? liveMatches.filter(
          (match) =>
            match.id !== featuredMatch?.id &&
            (tournament === "all" || match.tournament === tournament),
        )
      : [];

  return (
    <div className="min-h-screen bg-arena text-arena-ink">
      <SiteHeader
        game={game}
        activeView={view}
        onGameChange={setGame}
        onNavigate={handleNavigate}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />
      <main className="mx-auto max-w-[1320px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pb-16">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-accent">
              {t("lobby.eyebrow")}
            </p>
            <h1 className="mt-1 font-display text-3xl font-semibold tracking-tight text-arena-ink sm:text-4xl">
              {title}
            </h1>
            <p className="mt-1 max-w-xl text-sm text-arena-muted">{subtitle}</p>
            {view === "live" && ownMatches.length === 0 ? (
              <div className="mt-2 max-w-xl">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-arena-muted">
                  <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-arena-muted/50" />
                  <span className="font-medium text-arena-ink">
                    {t("own.disconnected")}
                  </span>
                  <span className="hidden sm:inline">· {t("own.hint")}</span>
                  <button
                    type="button"
                    onClick={() => setOwnHelpOpen((current) => !current)}
                    className="inline-flex items-center gap-1 font-semibold text-accent transition hover:text-accent-bright"
                  >
                    <InfoIcon className="h-3 w-3" />
                    {t("own.help")}
                  </button>
                </div>
                {ownHelpOpen ? (
                  <p className="mt-1 text-[11px] leading-4 text-arena-muted">
                    {t("own.helpBody")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-semibold",
                feedTone,
              )}
            >
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  feedOffline
                    ? "bg-red-300"
                    : connection === "connecting" ||
                        feedStatus === "STARTING" ||
                        feedStatus === "DEGRADED" ||
                        feedStatus === "STALE"
                      ? "bg-amber-300"
                      : "bg-live",
                )}
              />
              {feedLabel}
            </span>
          </div>
        </div>

        {featuredMatch ? (
          <div className="mt-5">
            <FeaturedMatch
              match={featuredMatch}
              markets={marketByMatchId.get(featuredMatch.id)}
              onOpen={handleOpenMatch}
              onSelect={handleSelect}
              selected={selectedFor(featuredMatch.id)}
            />
          </div>
        ) : null}

        {railMatches.length > 0 ? (
          <LiveRail
            matches={railMatches}
            markets={marketByMatchId}
            onOpen={handleOpenMatch}
            onSelect={handleSelect}
            selectedFor={selectedFor}
          />
        ) : null}

        {connection === "disconnected" && allMatches.length > 0 ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
            <span>
              {t("feed.staleBanner", {
                time: formatUpdatedAt(
                  data.feed?.lastSuccessAt ?? data.updatedAt,
                  language,
                ),
              })}
            </span>
            <button
              type="button"
              onClick={retry}
              className="ml-auto font-semibold text-amber-100 underline-offset-2 hover:underline"
            >
              {t("feed.retry")}
            </button>
          </div>
        ) : null}

        <LobbyTabs
          view={view}
          onChange={handleNavigate}
          liveCount={liveMatches.length + ownMatches.length}
          resultCount={resultCount}
        />

        <div className="mt-5 grid gap-6 lg:grid-cols-[200px_minmax(0,1fr)_330px]">
          <div className="hidden lg:block">
            <FilterRail
              tournament={tournament}
              onTournamentChange={setTournament}
              tournaments={tournaments}
              visibleCount={visibleForView}
              totalCount={totalForView}
              onClear={handleClear}
            />
          </div>

          <section id="matches" className="min-w-0 scroll-mt-24">
            <div className="mb-3 lg:hidden">
              <label className="sr-only" htmlFor="tournament-filter">
                {t("filters.tournament")}
              </label>
              <select
                id="tournament-filter"
                value={tournament}
                onChange={(event) => setTournament(event.target.value)}
                className="w-full rounded-lg border border-arena-line bg-arena-surface px-3 py-2 text-sm font-medium text-arena-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
              >
                <option value="all">{t("filters.allTournaments")}</option>
                {tournaments.map((option) => (
                  <option key={option.name} value={option.name}>
                    {option.name} ({option.count})
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-3 flex items-center justify-between gap-3 lg:hidden">
              <p className="text-xs font-medium text-arena-muted">
                {t("filters.showing", {
                  count: formatNumber(visibleForView, language),
                })}
              </p>
              <button
                type="button"
                onClick={handleClear}
                disabled={tournament === "all"}
                className="text-[11px] font-semibold text-accent transition hover:text-accent-bright disabled:cursor-not-allowed disabled:text-arena-muted/40"
              >
                {t("filters.clear")}
              </button>
            </div>

            <div className="space-y-3">
              {filteredMatches.map((match, index) => (
                <MatchCard
                  key={match.id}
                  match={match}
                  markets={marketByMatchId.get(match.id)}
                  onOpen={handleOpenMatch}
                  onSelect={handleSelect}
                  selected={selectedFor(match.id)}
                  index={index}
                />
              ))}

              {filteredMatches.length === 0 && !featuredMatch ? (
                <div className="rounded-3xl border border-dashed border-arena-line bg-arena-surface/50 px-6 py-12 text-center">
                  <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl border border-arena-line bg-arena-raised text-arena-muted">
                    <PulseMark className="h-6 w-6" />
                  </span>
                  <h2 className="mt-4 text-sm font-semibold text-arena-ink">
                    {emptyState.title}
                  </h2>
                  <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-arena-muted">
                    {emptyState.body}
                  </p>
                  <button
                    type="button"
                    onClick={emptyState.onAction}
                    className="mt-5 inline-flex items-center gap-2 rounded-lg border border-arena-line px-4 py-2.5 text-sm font-semibold text-arena-ink transition hover:bg-white/5"
                  >
                    {emptyState.action}
                    <ArrowRightIcon className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              {filteredMatches.length === 0 && featuredMatch ? (
                <p className="rounded-2xl border border-dashed border-arena-line bg-arena-surface/40 px-4 py-6 text-center text-xs text-arena-muted">
                  {t("lobby.onlyFeatured")}
                </p>
              ) : null}
            </div>
          </section>

          <BetSlip
            target={betTarget}
            onClear={handleClearBet}
            onLogin={() => openLogin("login")}
            onExplore={handleExplore}
          />
        </div>
      </main>

      <SiteFooter variant="dark" />

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-arena-line bg-arena-surface/95 p-3 backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-[1320px] items-center gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent/15 text-accent">
            <TicketIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            {betTarget ? (
              <>
                <p className="truncate text-xs font-semibold text-arena-ink">
                  {matchSelectionLabel(
                    betTarget.match,
                    betTarget.market,
                    betTarget.selection.key,
                    t,
                  )}
                </p>
                <p className="truncate text-[11px] text-arena-muted">
                  {marketTitle(betTarget.market, t)} ·{" "}
                  {formatOdds(betTarget.selection.odds)}
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold text-arena-ink">
                  {t("bet.title")}
                </p>
                <p className="truncate text-[11px] text-arena-muted">
                  {t("bet.emptyBody")}
                </p>
              </>
            )}
          </div>
          {betTarget ? (
            <button
              type="button"
              onClick={() => setBetPanelOpen(true)}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-navy transition hover:bg-accent-bright"
            >
              {t("bet.open")}
            </button>
          ) : user ? (
            <Link
              href="/wallet"
              className="shrink-0 rounded-lg border border-arena-line px-4 py-2 text-sm font-semibold text-arena-ink transition hover:bg-white/5"
            >
              {t("header.wallet")}
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="shrink-0 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-navy transition hover:bg-accent-bright"
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
          markets={marketByMatchId.get(selectedMatch.id)}
          onClose={() => setSelectedId(null)}
          onSelect={handleSelect}
        />
      ) : null}

      {betPanelOpen ? (
        <Modal
          open
          onClose={() => setBetPanelOpen(false)}
          labelledBy="mobile-bet-title"
          panelClassName="sm:max-w-md"
          variant="dark"
        >
          <div id="mobile-bet-title" className="sr-only">
            {t("bet.title")}
          </div>
          <div className="p-3 sm:p-4">
            <BetSlip
              compact
              target={betTarget}
              onClear={handleClearBet}
              onLogin={() => openLogin("login")}
              onExplore={handleExplore}
              onClose={() => setBetPanelOpen(false)}
            />
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
