"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRightIcon } from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { MatchDetailModal } from "@/components/match-detail-modal";
import { Modal } from "@/components/modal";
import {
  CompetitionRows,
  type CompetitionSection,
  type EventRow,
} from "@/components/public/competition-rows";
import {
  FeaturedEvents,
  type FeaturedEvent,
} from "@/components/public/featured-events";
import { MobileBetBar } from "@/components/public/mobile-bet-bar";
import { PrematchMarketsModal } from "@/components/public/prematch-markets-modal";
import { QuickBetSlip } from "@/components/public/quick-bet-slip";
import { RangeTabs, type DateRange } from "@/components/public/range-tabs";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { formatGameTime, kickoffTiming, normalizeText } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { useLobbyFeed } from "@/lib/live";
import { matchSelectionLabel } from "@/lib/match-labels";
import type { LobbyData, LobbyMatch } from "@/lib/lobby";
import {
  indexMarkets,
  selectionLabelForType,
  type LiveMarketsData,
  type Market,
  type Selection,
} from "@/lib/markets";
import {
  fixtureToMarket,
  primaryFixtureMarket,
  type PublicSport,
} from "@/lib/prematch";
import type {
  Fixture,
  FixtureMarket,
  FixtureSelection,
  FixturesResponse,
} from "@/lib/sports";

type HomeLobbyProps = {
  data: LobbyData;
  markets: LiveMarketsData;
  soccer: FixturesResponse;
  basketball: FixturesResponse;
};

type Range = DateRange;

type BetSelection =
  | { kind: "dota"; matchId: string; marketId: string; selectionKey: string }
  | {
      kind: "fixture";
      sport: PublicSport;
      fixtureId: string;
      marketId: string;
      selectionKey: string;
    };

export function HomeLobby({
  data: initialData,
  markets: initialMarkets,
  soccer,
  basketball,
}: HomeLobbyProps) {
  const { t, language } = useLanguage();
  const { data, markets, connection, retry } = useLobbyFeed(
    initialData,
    initialMarkets,
  );
  const [range, setRange] = useState<Range>(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 24 * 60 * 60 * 1000;
    const fixtures = [...soccer.leagues, ...basketball.leagues].flatMap(
      (league) => league.fixtures,
    );
    return fixtures.some((fixture) => {
      const kickoff = new Date(fixture.kickoff).getTime();
      return kickoff >= start.getTime() && kickoff < end;
    })
      ? "today"
      : "week";
  });
  const [liveOnly, setLiveOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [betSelection, setBetSelection] = useState<BetSelection | null>(null);
  const [betPanelOpen, setBetPanelOpen] = useState(false);
  const [dotaModalId, setDotaModalId] = useState<string | null>(null);
  const [fixtureModal, setFixtureModal] = useState<{
    fixture: Fixture;
    sport: PublicSport;
  } | null>(null);

  const marketByMatchId = useMemo(() => indexMarkets(markets), [markets]);

  const liveMatches = useMemo(
    () =>
      [...data.live].sort(
        (a, b) =>
          Number(b.source === "GSI") - Number(a.source === "GSI") ||
          (b.spectators ?? 0) - (a.spectators ?? 0),
      ),
    [data.live],
  );

  const soccerFixtures = useMemo(
    () => soccer.leagues.flatMap((league) => league.fixtures),
    [soccer.leagues],
  );
  const nbaFixtures = useMemo(
    () => basketball.leagues.flatMap((league) => league.fixtures),
    [basketball.leagues],
  );

  const footballPool = useMemo(
    () => soccerFixtures.filter((fixture) => fixture.markets.length > 0),
    [soccerFixtures],
  );
  const nbaPool = useMemo(
    () => nbaFixtures.filter((fixture) => fixture.markets.length > 0),
    [nbaFixtures],
  );
  const dotaPool = useMemo(
    () =>
      liveMatches.filter(
        (match) => (marketByMatchId.get(match.id)?.length ?? 0) > 0,
      ),
    [liveMatches, marketByMatchId],
  );
  const namedDota = useMemo(
    () =>
      dotaPool.filter(
        (match) =>
          match.radiant.name !== "Radiant" && match.dire.name !== "Dire",
      ),
    [dotaPool],
  );

  const featuredSeeds = useMemo(() => {
    const seeds: { kind: "fixture" | "dota"; value: Fixture | LobbyMatch }[] =
      [];
    // La foto del destacado NBA muestra a un jugador de Denver: si hay partido
    // suyo en el calendario, se destaca para que la imagen y los equipos
    // concuerden. Si no, se usa el primero disponible.
    const nbaFeatured =
      nbaPool.find(
        (fixture) =>
          /nuggets|denver/i.test(fixture.home.name) ||
          /nuggets|denver/i.test(fixture.away.name),
      ) ?? nbaPool[0];
    if (nbaFeatured) seeds.push({ kind: "fixture", value: nbaFeatured });
    if (footballPool[0]) seeds.push({ kind: "fixture", value: footballPool[0] });
    const dotaSeed = namedDota[0] ?? dotaPool[0];
    if (dotaSeed) seeds.push({ kind: "dota", value: dotaSeed });
    if (seeds.length < 3 && footballPool[1]) {
      seeds.push({ kind: "fixture", value: footballPool[1] });
    }
    const nbaFallback = nbaPool.find((fixture) => fixture !== nbaFeatured);
    if (seeds.length < 3 && nbaFallback) {
      seeds.push({ kind: "fixture", value: nbaFallback });
    }
    return seeds.slice(0, 3);
  }, [dotaPool, footballPool, namedDota, nbaPool]);

  const featuredEvents = useMemo<FeaturedEvent[]>(
    () =>
      featuredSeeds.map((seed) => {
        if (seed.kind === "dota") {
          const match = seed.value as LobbyMatch;
          const market = marketByMatchId.get(match.id)?.[0];
          return {
            id: `d:${match.id}`,
            sport: "esports",
            competition: match.tournament || "Dota 2",
            homeName: match.radiant.name,
            awayName: match.dire.name,
            homeCrestUrl: match.radiant.teamId
              ? `/api/catalog/teams/${match.radiant.teamId}/logo`
              : null,
            awayCrestUrl: match.dire.teamId
              ? `/api/catalog/teams/${match.dire.teamId}/logo`
              : null,
            homeScore: match.radiant.score,
            awayScore: match.dire.score,
            status: match.state === "live" ? "LIVE" : "FINISHED",
            meta: formatGameTime(match.durationSeconds),
            image: "/hero/esports-wide.jpg",
            market,
          } satisfies FeaturedEvent;
        }
        const fixture = seed.value as Fixture;
        const primary = primaryFixtureMarket(fixture);
        const sport: PublicSport = nbaPool.includes(fixture) ? "nba" : "football";
        const timing = kickoffTiming(fixture.kickoff, language);
        const dayLabel =
          timing.day === "today"
            ? t("home.filter.today")
            : timing.day === "tomorrow"
              ? t("home.filter.tomorrow")
              : timing.weekday;
        return {
          id: `f:${fixture.id}`,
          sport,
          competition: fixture.leagueName,
          homeName: fixture.home.name,
          awayName: fixture.away.name,
          homeCrestUrl: fixture.home.crestUrl,
          awayCrestUrl: fixture.away.crestUrl,
          homeScore: fixture.homeScore,
          awayScore: fixture.awayScore,
          status:
            fixture.state === "LIVE"
              ? "LIVE"
              : fixture.state === "FINISHED"
                ? "FINISHED"
                : "SCHEDULED",
          meta: `${dayLabel} ${timing.time}`,
          image:
            sport === "nba"
              ? "/hero/basketball-wide.jpg"
              : "/hero/football-wide.jpg",
          market: primary ? fixtureToMarket(fixture, primary, sport) : undefined,
        } satisfies FeaturedEvent;
      }),
    [featuredSeeds, language, marketByMatchId, nbaPool, t],
  );

  const featuredIds = useMemo(
    () => new Set(featuredEvents.map((event) => event.id)),
    [featuredEvents],
  );

  const rangeStart = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    return start;
  }, []);

  const sections = useMemo<CompetitionSection[]>(() => {
    const day = 24 * 60 * 60 * 1000;
    const start = rangeStart.getTime();
    const within = (kickoff: string) => {
      const time = new Date(kickoff).getTime();
      // La búsqueda recorre todo el calendario cargado, sin recortar por día.
      if (query.trim().length > 0) {
        return true;
      }
      if (range === "today") {
        return time >= start && time < start + day;
      }
      if (range === "tomorrow") {
        return time >= start + day && time < start + 2 * day;
      }
      return time >= start && time < start + 8 * day;
    };

    const needle = normalizeText(query);
    const matches = (...values: Array<string | null | undefined>) =>
      needle.length === 0 ||
      values.some((value) =>
        value ? normalizeText(value).includes(needle) : false,
      );

    const result: CompetitionSection[] = [];

    if (!liveOnly) {
      const nbaRows = nbaPool
        .filter(
          (fixture) =>
            !featuredIds.has(`f:${fixture.id}`) &&
            within(fixture.kickoff) &&
            matches(fixture.leagueName, fixture.home.name, fixture.away.name),
        )
        .slice()
        .sort((a, b) => a.kickoff.localeCompare(b.kickoff))
        .slice(0, 8);
      if (nbaRows.length > 0) {
        result.push({
          id: "nba",
          name: "NBA",
          sport: "nba",
          rows: nbaRows.map((fixture) => ({
            kind: "fixture" as const,
            fixture,
            sport: "nba" as const,
          })),
        });
      }

      const available = footballPool.filter(
        (fixture) =>
          !featuredIds.has(`f:${fixture.id}`) &&
          within(fixture.kickoff) &&
          matches(fixture.leagueName, fixture.home.name, fixture.away.name),
      );
      const byLeague = new Map<string, Fixture[]>();
      available.forEach((fixture) => {
        const list = byLeague.get(fixture.leagueName) ?? [];
        list.push(fixture);
        byLeague.set(fixture.leagueName, list);
      });
      const leagueOrder = new Map(
        soccer.leagues.map((league, index) => [league.name, index]),
      );
      [...byLeague.entries()]
        .map(([name, fixtures]) => ({
          name,
          fixtures: fixtures
            .slice()
            .sort((a, b) => a.kickoff.localeCompare(b.kickoff)),
        }))
        .filter((entry) => entry.fixtures.length > 0)
        .sort(
          (a, b) =>
            (leagueOrder.get(a.name) ?? 99) - (leagueOrder.get(b.name) ?? 99),
        )
        .slice(0, 3)
        .forEach((entry) => {
          result.push({
            id: `football:${entry.name}`,
            name: entry.name,
            sport: "football",
            rows: entry.fixtures.slice(0, 4).map((fixture) => ({
              kind: "fixture" as const,
              fixture,
              sport: "football" as const,
            })),
          });
        });
    }

    const dotaRows = liveMatches
      .filter(
        (match) =>
          !featuredIds.has(`d:${match.id}`) &&
          (marketByMatchId.get(match.id)?.length ?? 0) > 0 &&
          matches(
            match.tournament,
            match.radiant.name,
            match.dire.name,
            "dota",
          ),
      )
      .slice(0, 6);
    if (dotaRows.length > 0) {
      result.push({
        id: "esports",
        name: "Dota 2",
        sport: "esports",
        rows: dotaRows.map<EventRow>((match) => ({
          kind: "dota",
          match,
          markets: marketByMatchId.get(match.id) ?? [],
        })),
      });
    }

    return result;
  }, [
    featuredIds,
    footballPool,
    liveMatches,
    liveOnly,
    marketByMatchId,
    nbaPool,
    query,
    range,
    rangeStart,
    soccer.leagues,
  ]);

  const betTarget = useMemo(() => {
    if (!betSelection) {
      return null;
    }
    if (betSelection.kind === "dota") {
      const match = liveMatches.find(
        (candidate) => candidate.id === betSelection.matchId,
      );
      const market = marketByMatchId
        .get(betSelection.matchId)
        ?.find((candidate) => candidate.id === betSelection.marketId);
      const selection = market?.selections.find(
        (candidate) => candidate.key === betSelection.selectionKey,
      );
      if (!match || !market || !selection) {
        return null;
      }
      return {
        subject: {
          id: match.id,
          homeName: match.radiant.name,
          awayName: match.dire.name,
          homeTeam: match.radiant,
          awayTeam: match.dire,
        },
        market,
        selection,
        selectionLabel: matchSelectionLabel(match, market, selection.key, t),
      };
    }
    const fixture = [...soccerFixtures, ...nbaFixtures].find(
      (candidate) => candidate.id === betSelection.fixtureId,
    );
    const fixtureMarket = fixture?.markets.find(
      (candidate) => candidate.id === betSelection.marketId,
    );
    const selection = fixtureMarket?.selections.find(
      (candidate) => candidate.key === betSelection.selectionKey,
    );
    if (!fixture || !fixtureMarket || !selection) {
      return null;
    }
    return {
      subject: {
        id: fixture.id,
        homeName: fixture.home.name,
        awayName: fixture.away.name,
        homeCrestUrl: fixture.home.crestUrl,
        awayCrestUrl: fixture.away.crestUrl,
      },
      market: fixtureToMarket(fixture, fixtureMarket, betSelection.sport),
      selection,
      selectionLabel: selectionLabelForType(
        fixtureMarket.marketKey,
        fixtureMarket.line,
        selection.key,
        t,
        { home: fixture.home.name, away: fixture.away.name },
      ),
    };
  }, [betSelection, liveMatches, marketByMatchId, nbaFixtures, soccerFixtures, t]);

  const selected = betSelection
    ? betSelection.kind === "dota"
      ? {
          kind: "dota" as const,
          id: betSelection.matchId,
          marketId: betSelection.marketId,
          selectionKey: betSelection.selectionKey,
        }
      : {
          kind: "fixture" as const,
          id: betSelection.fixtureId,
          marketId: betSelection.marketId,
          selectionKey: betSelection.selectionKey,
        }
    : null;

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const selectDota = (
    match: LobbyMatch,
    market: Market,
    selection: Selection,
  ) => {
    setBetSelection({
      kind: "dota",
      matchId: match.id,
      marketId: market.id,
      selectionKey: selection.key,
    });
  };

  const selectFixture = (
    fixture: Fixture,
    market: FixtureMarket,
    selection: FixtureSelection,
    sport: PublicSport,
  ) => {
    setBetSelection({
      kind: "fixture",
      sport,
      fixtureId: fixture.id,
      marketId: market.id,
      selectionKey: selection.key,
    });
  };

  const openFeatured = (event: FeaturedEvent) => {
    const id = event.id.slice(2);
    if (event.sport === "esports") {
      setDotaModalId(id);
      return;
    }
    const fixture = [...soccerFixtures, ...nbaFixtures].find(
      (candidate) => candidate.id === id,
    );
    if (fixture) {
      setFixtureModal({
        fixture,
        sport: nbaFixtures.includes(fixture) ? "nba" : "football",
      });
    }
  };

  const selectFeatured = (
    event: FeaturedEvent,
    market: Market,
    selection: Selection,
  ) => {
    const id = event.id.slice(2);
    if (event.sport === "esports") {
      const match = liveMatches.find((candidate) => candidate.id === id);
      if (match) {
        selectDota(match, market, selection);
      }
      return;
    }
    const fixture = [...soccerFixtures, ...nbaFixtures].find(
      (candidate) => candidate.id === id,
    );
    const fixtureMarket = fixture?.markets.find(
      (candidate) => candidate.id === market.id,
    );
    if (fixture && fixtureMarket) {
      selectFixture(
        fixture,
        fixtureMarket,
        selection as FixtureSelection,
        nbaFixtures.includes(fixture) ? "nba" : "football",
      );
    }
  };

  const selectedDota = data.live.find((match) => match.id === dotaModalId);
  const selectedFixtureMarket =
    fixtureModal && betSelection?.kind === "fixture"
      ? {
          marketId: betSelection.marketId,
          selectionKey: betSelection.selectionKey,
        }
      : null;

  const emptyCopy =
    query.trim().length > 0
      ? {
          title: t("home.search.empty"),
          body: t("home.search.emptyBody"),
        }
      : liveOnly
        ? {
            title: t("home.empty.live"),
            body: t("home.empty.liveBody"),
          }
        : {
            title: t("home.empty.section"),
            body: t("home.empty.sectionBody"),
          };

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader
        game="dota2"
        activeView="all"
        showSportsNav
        searchQuery={query}
        onSearchChange={setQuery}
        onGameChange={() => undefined}
        onNavigate={() => undefined}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-5 sm:px-7 xl:pb-16">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_300px]">
          <div className="min-w-0">
            <FeaturedEvents
              events={featuredEvents}
              selected={selected}
              onOpen={openFeatured}
              onSelect={selectFeatured}
            />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
              <h1 className="font-display text-[26px] font-bold tracking-tight text-ink sm:text-[28px]">
                {t("home.heading")}
              </h1>
              <div className="flex flex-wrap items-center gap-3">
                <RangeTabs value={range} onChange={setRange} />
                <span aria-hidden="true" className="h-5 w-px bg-line" />
                <label className="flex cursor-pointer items-center gap-2 text-[13px] font-medium text-ink">
                  <input
                    type="checkbox"
                    checked={liveOnly}
                    onChange={(event) => setLiveOnly(event.target.checked)}
                    className="h-4 w-4 rounded border-line accent-accent"
                  />
                  {t("home.filter.live")}
                </label>
              </div>
            </div>

            {connection === "disconnected" ? (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-900">
                <span>{t("feed.staleBanner", { time: "—" })}</span>
                <button
                  type="button"
                  onClick={retry}
                  className="rounded-lg border border-amber-300 px-2.5 py-1 font-semibold transition hover:bg-amber-100"
                >
                  {t("feed.retry")}
                </button>
              </div>
            ) : null}

            <div className="mt-4">
              {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-ink">
                    {emptyCopy.title}
                  </p>
                  <p className="mt-1 text-xs text-muted">{emptyCopy.body}</p>
                </div>
              ) : (
                <CompetitionRows
                  sections={sections}
                  selected={selected}
                  onFixtureSelect={selectFixture}
                  onFixtureOpen={(fixture, sport) =>
                    setFixtureModal({ fixture, sport })
                  }
                  onDotaSelect={selectDota}
                  onDotaOpen={(match) => setDotaModalId(match.id)}
                />
              )}
            </div>

            <Link
              href="/sports"
              className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold text-accent-strong transition hover:text-accent"
            >
              {t("home.viewAll")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-[136px]">
              <QuickBetSlip
                target={betTarget}
                onClear={() => setBetSelection(null)}
                onLogin={() => openLogin("login")}
              />
              <Link
                href="/bets"
                className="mt-3 inline-block text-[13px] font-medium text-ink underline underline-offset-4 transition hover:text-accent-strong"
              >
                {t("home.viewMyBets")}
              </Link>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />

      <MobileBetBar target={betTarget} onOpen={() => setBetPanelOpen(true)} />

      <Modal
        open={betPanelOpen}
        onClose={() => setBetPanelOpen(false)}
        labelledBy="home-bet-title"
        panelClassName="max-w-md"
      >
        <h2 id="home-bet-title" className="sr-only">
          {t("home.betbar")}
        </h2>
        <QuickBetSlip
          compact
          target={betTarget}
          onClear={() => {
            setBetSelection(null);
            setBetPanelOpen(false);
          }}
          onLogin={() => openLogin("login")}
          onClose={() => setBetPanelOpen(false)}
        />
      </Modal>

      {selectedDota ? (
        <MatchDetailModal
          match={selectedDota}
          markets={marketByMatchId.get(selectedDota.id) ?? []}
          initialTab="markets"
          onClose={() => setDotaModalId(null)}
          onSelect={selectDota}
        />
      ) : null}

      {fixtureModal ? (
        <PrematchMarketsModal
          fixture={fixtureModal.fixture}
          sport={fixtureModal.sport}
          selected={selectedFixtureMarket}
          onSelect={(fixture, market, selection) =>
            selectFixture(fixture, market, selection, fixtureModal.sport)
          }
          onClose={() => setFixtureModal(null)}
        />
      ) : null}

      {loginOpen ? (
        <LoginModal
          open
          mode={loginMode}
          onModeChange={setLoginMode}
          onClose={() => setLoginOpen(false)}
        />
      ) : null}
    </div>
  );
}

