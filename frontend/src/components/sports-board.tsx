"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { BetTarget } from "@/components/bet-slip";
import { SearchIcon } from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { Modal } from "@/components/modal";
import {
  CompetitionRows,
  type CompetitionSection,
} from "@/components/public/competition-rows";
import { MobileBetBar } from "@/components/public/mobile-bet-bar";
import { PrematchMarketsModal } from "@/components/public/prematch-markets-modal";
import { QuickBetSlip } from "@/components/public/quick-bet-slip";
import { RangeTabs, type DateRange } from "@/components/public/range-tabs";
import { SportHero } from "@/components/public/sport-hero";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { cn, normalizeText } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { selectionLabelForType } from "@/lib/markets";
import { fixtureToMarket, type PublicSport } from "@/lib/prematch";
import type {
  Fixture,
  FixtureMarket,
  FixtureSelection,
  FixturesResponse,
} from "@/lib/sports";

type SelectionRef = {
  fixtureId: string;
  marketId: string;
  selectionKey: string;
};

export function SportsBoard({
  data,
  sport,
}: {
  data: FixturesResponse;
  sport: PublicSport;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [leagueId, setLeagueId] = useState("all");
  const [query, setQuery] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [selection, setSelection] = useState<SelectionRef | null>(null);
  const [betPanelOpen, setBetPanelOpen] = useState(false);
  const [modalFixture, setModalFixture] = useState<Fixture | null>(null);

  const allFixtures = useMemo(
    () => data.leagues.flatMap((item) => item.fixtures),
    [data.leagues],
  );

  const [range, setRange] = useState<DateRange>(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = start.getTime() + 24 * 60 * 60 * 1000;
    return allFixtures.some((fixture) => {
      const kickoff = new Date(fixture.kickoff).getTime();
      return kickoff >= start.getTime() && kickoff < end;
    })
      ? "today"
      : "week";
  });

  const needle = normalizeText(query);

  const visible = useMemo(() => {
    const matches = (fixture: Fixture) =>
      needle.length === 0 ||
      normalizeText(fixture.leagueName).includes(needle) ||
      normalizeText(fixture.home.name).includes(needle) ||
      normalizeText(fixture.away.name).includes(needle);

    const inRange = (kickoff: string) => {
      if (needle.length > 0) {
        return true;
      }
      const time = new Date(kickoff).getTime();
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const day = 24 * 60 * 60 * 1000;
      if (range === "today") {
        return time >= start.getTime() && time < start.getTime() + day;
      }
      if (range === "tomorrow") {
        return (
          time >= start.getTime() + day && time < start.getTime() + 2 * day
        );
      }
      return time >= start.getTime() && time < start.getTime() + 8 * day;
    };

    return allFixtures.filter(
      (fixture) => inRange(fixture.kickoff) && matches(fixture),
    );
  }, [allFixtures, needle, range]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    visible.forEach((fixture) => {
      map.set(fixture.leagueId, (map.get(fixture.leagueId) ?? 0) + 1);
    });
    return map;
  }, [visible]);

  const leagues = useMemo(
    () =>
      data.leagues
        .map((league) => ({
          id: league.id,
          name: league.name,
          count: counts.get(league.id) ?? 0,
        }))
        .filter((league) => league.count > 0),
    [counts, data.leagues],
  );

  const sections = useMemo<CompetitionSection[]>(() => {
    const visibleIds = new Set(visible.map((fixture) => fixture.id));
    const capRows = leagues.length > 1 && leagueId === "all";
    return data.leagues
      .filter((league) => leagueId === "all" || league.id === leagueId)
      .map((league) => {
        const rows = league.fixtures
          .filter((fixture) => visibleIds.has(fixture.id))
          .slice()
          .sort((a, b) => a.kickoff.localeCompare(b.kickoff));
        return {
          id: `sports:${league.id}`,
          name: league.name,
          sport,
          rows: (capRows ? rows.slice(0, 4) : rows).map((fixture) => ({
            kind: "fixture" as const,
            fixture,
            sport,
          })),
        };
      })
      .filter((section) => section.rows.length > 0);
  }, [data.leagues, leagueId, leagues.length, sport, visible]);

  const betTarget = useMemo<BetTarget | null>(() => {
    if (!selection) {
      return null;
    }
    const fixture = allFixtures.find((item) => item.id === selection.fixtureId);
    const fixtureMarket = fixture?.markets.find(
      (item) => item.id === selection.marketId,
    );
    const picked = fixtureMarket?.selections.find(
      (item) => item.key === selection.selectionKey,
    );
    if (!fixture || !fixtureMarket || !picked) {
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
      market: fixtureToMarket(fixture, fixtureMarket, sport),
      selection: picked,
      selectionLabel: selectionLabelForType(
        fixtureMarket.marketKey,
        fixtureMarket.line,
        picked.key,
        t,
        { home: fixture.home.name, away: fixture.away.name },
      ),
    };
  }, [allFixtures, selection, sport, t]);

  const select = (
    fixture: Fixture,
    market: FixtureMarket,
    picked: FixtureSelection,
  ) => {
    setSelection({
      fixtureId: fixture.id,
      marketId: market.id,
      selectionKey: picked.key,
    });
  };

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const title =
    sport === "nba" ? t("sports.titleBasketball") : t("sports.title");
  const subtitle =
    sport === "nba" ? t("sports.subtitleBasketball") : t("sports.subtitle");
  const updatedLabel =
    data.status === "DOWN"
      ? t("sports.down")
      : `${t("sports.updated")} ${new Intl.DateTimeFormat(
          language === "es" ? "es-PE" : "en-US",
          { hour: "2-digit", minute: "2-digit" },
        ).format(new Date(data.updatedAt))}`;
  const showRail = leagues.length > 1;
  const capRows = showRail && leagueId === "all";

  const featuredFixture = useMemo(() => {
    const pool = visible.filter(
      (fixture) =>
        fixture.state !== "FINISHED" &&
        (leagueId === "all" || fixture.leagueId === leagueId),
    );
    // Las fotos de portada muestran un partido concreto (Forest–Chelsea y
    // Denver): si ese equipo juega en el rango, se destaca para que la imagen
    // y los escudos concuerden. Si no, se usa el próximo encuentro.
    const photoTeams =
      sport === "nba" ? /nuggets|denver/i : /nottingham|chelsea/i;
    const preferred = pool.find(
      (fixture) =>
        photoTeams.test(fixture.home.name) ||
        photoTeams.test(fixture.away.name),
    );
    return (
      preferred ??
      pool.slice().sort((a, b) => a.kickoff.localeCompare(b.kickoff))[0]
    );
  }, [leagueId, sport, visible]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader
        game="dota2"
        activeView="all"
        activeSport={sport}
        showSportsNav
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />

      <main className="mx-auto max-w-[1440px] px-4 pb-28 pt-6 sm:px-7 xl:pb-16">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-strong transition hover:text-accent"
            >
              {t("nav.home")}
            </Link>
            <h1 className="mt-2 font-display text-[26px] font-bold tracking-tight sm:text-[30px]">
              {title}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{subtitle}</p>
          </div>
          <div className="text-right text-xs text-muted">
            <p>{updatedLabel}</p>
            <p className="mt-1 font-score tabular-nums">
              {visible.length} {t("sports.matches")}
            </p>
          </div>
        </div>

        {featuredFixture ? (
          <SportHero
            fixture={featuredFixture}
            sport={sport}
            onOpen={setModalFixture}
          />
        ) : null}

        <div
          className={cn(
            "mt-6 grid gap-6",
            showRail
              ? "xl:grid-cols-[200px_minmax(0,1fr)_300px]"
              : "xl:grid-cols-[minmax(0,1fr)_300px]",
          )}
        >
          {showRail ? (
            <aside className="hidden xl:block">
            <div className="sticky top-[136px] rounded-xl border border-line bg-white p-3">
              <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-subtle">
                {t("sports.competitions")}
              </p>
              <nav className="space-y-0.5">
                <LeagueItem
                  active={leagueId === "all"}
                  name={t("sports.allLeagues")}
                  count={visible.length}
                  onClick={() => setLeagueId("all")}
                />
                {leagues.map((league) => (
                  <LeagueItem
                    key={league.id}
                    active={leagueId === league.id}
                    name={league.name}
                    count={league.count}
                    onClick={() => setLeagueId(league.id)}
                  />
                ))}
              </nav>
            </div>
            </aside>
          ) : null}

          <div className="min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <RangeTabs value={range} onChange={setRange} />
              <div className="relative w-full sm:w-[280px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("sports.search")}
                  aria-label={t("sports.search")}
                  className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            {showRail ? (
              <div className="no-scrollbar mt-3 flex items-center gap-2 overflow-x-auto xl:hidden">
              <button
                type="button"
                onClick={() => setLeagueId("all")}
                aria-pressed={leagueId === "all"}
                className={cn(
                  "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition",
                  leagueId === "all"
                    ? "border-accent bg-accent text-masthead"
                    : "border-line bg-white text-ink hover:border-accent/40",
                )}
              >
                {t("sports.allLeagues")}
                <span className="tabular-nums opacity-70">{visible.length}</span>
              </button>
              {leagues.map((league) => (
                <button
                  key={league.id}
                  type="button"
                  onClick={() => setLeagueId(league.id)}
                  aria-pressed={leagueId === league.id}
                  className={cn(
                    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[12px] font-semibold transition",
                    leagueId === league.id
                      ? "border-accent bg-accent text-masthead"
                      : "border-line bg-white text-ink hover:border-accent/40",
                  )}
                >
                  {league.name}
                  <span className="tabular-nums opacity-70">{league.count}</span>
                </button>
              ))}
              </div>
            ) : null}

            <div className="mt-4">
              {sections.length === 0 ? (
                <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
                  <p className="text-sm font-semibold text-ink">
                    {query.trim().length > 0
                      ? t("sports.searchEmpty")
                      : data.status === "DOWN"
                        ? t("sports.down")
                        : t("sports.empty")}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t("sports.emptyBody")}
                  </p>
                </div>
              ) : (
                <CompetitionRows
                  sections={sections}
                  selected={
                    selection
                      ? {
                          kind: "fixture",
                          id: selection.fixtureId,
                          marketId: selection.marketId,
                          selectionKey: selection.selectionKey,
                        }
                      : null
                  }
                  onFixtureSelect={select}
                  onFixtureOpen={setModalFixture}
                  onDotaSelect={() => undefined}
                  onDotaOpen={() => undefined}
                />
              )}
            </div>

            {capRows && sections.length > 0 ? (
              <p className="mt-3 text-[11px] text-muted">
                {t("sports.railHint")}
              </p>
            ) : null}
          </div>

          <aside className="hidden xl:block">
            <div className="sticky top-[136px]">
              <QuickBetSlip
                target={betTarget}
                onClear={() => setSelection(null)}
                onLogin={() => openLogin("login")}
              />
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />

      <MobileBetBar target={betTarget} onOpen={() => setBetPanelOpen(true)} />

      <Modal
        open={betPanelOpen}
        onClose={() => setBetPanelOpen(false)}
        labelledBy="sports-bet-title"
        panelClassName="max-w-md"
      >
        <h2 id="sports-bet-title" className="sr-only">
          {t("home.betbar")}
        </h2>
        <QuickBetSlip
          compact
          target={betTarget}
          onClear={() => {
            setSelection(null);
            setBetPanelOpen(false);
          }}
          onLogin={() => openLogin("login")}
          onClose={() => setBetPanelOpen(false)}
        />
      </Modal>

      {modalFixture ? (
        <PrematchMarketsModal
          fixture={modalFixture}
          sport={sport}
          selected={
            selection?.fixtureId === modalFixture.id
              ? {
                  marketId: selection.marketId,
                  selectionKey: selection.selectionKey,
                }
              : null
          }
          onSelect={select}
          onClose={() => setModalFixture(null)}
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

function LeagueItem({
  active,
  name,
  count,
  onClick,
}: {
  active: boolean;
  name: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md border-l-2 px-2.5 py-2 text-left text-[13px] font-medium transition",
        active
          ? "border-accent bg-accent/10 text-accent-strong"
          : "border-transparent text-ink hover:bg-paper",
      )}
    >
      <span className="min-w-0 truncate">{name}</span>
      <span
        className={cn(
          "shrink-0 text-[11px] tabular-nums",
          active ? "text-accent-strong/70" : "text-subtle",
        )}
      >
        {count}
      </span>
    </button>
  );
}
