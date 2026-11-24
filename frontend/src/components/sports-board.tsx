"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BetSlip, type BetTarget } from "@/components/bet-slip";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { Modal } from "@/components/modal";
import { OddsButton } from "@/components/odds-button";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { TicketIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  marketTitle,
  selectionLabelForType,
  type Market,
  type MarketStatus,
} from "@/lib/markets";
import type {
  Fixture,
  FixtureMarket,
  FixtureSelection,
  FixtureTeam,
  FixturesResponse,
} from "@/lib/sports";

type BetSelectionRef = {
  fixtureId: string;
  marketId: string;
  selectionKey: string;
};

export function SportsBoard({
  soccer,
  basketball,
}: {
  soccer: FixturesResponse;
  basketball: FixturesResponse;
}) {
  const { t, language } = useLanguage();
  const router = useRouter();
  const [sport, setSport] = useState<"soccer" | "basketball">("soccer");
  const [selected, setSelected] = useState<string>("all");
  const [now, setNow] = useState<number | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [betSelection, setBetSelection] = useState<BetSelectionRef | null>(null);
  const [betPanelOpen, setBetPanelOpen] = useState(false);
  const data = sport === "soccer" ? soccer : basketball;

  useEffect(() => {
    setNow(Date.now());
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const selectSport = (next: "soccer" | "basketball") => {
    if (next === sport) {
      return;
    }
    setSport(next);
    setSelected("all");
    setBetSelection(null);
  };

  const leagues = useMemo(
    () => data.leagues.filter((league) => league.fixtures.length > 0),
    [data.leagues],
  );
  const visible =
    selected === "all" ? leagues : leagues.filter((league) => league.id === selected);
  const total = leagues.reduce((sum, league) => sum + league.fixtures.length, 0);

  const betTarget = useMemo<BetTarget | null>(() => {
    if (!betSelection) {
      return null;
    }
    for (const league of leagues) {
      const fixture = league.fixtures.find(
        (candidate) => candidate.id === betSelection.fixtureId,
      );
      if (!fixture) {
        continue;
      }
      const market = fixture.markets.find(
        (candidate) => candidate.id === betSelection.marketId,
      );
      const selection = market?.selections.find(
        (candidate) => candidate.key === betSelection.selectionKey,
      );
      if (!market || !selection) {
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
        market: toMarket(fixture, market),
        selection,
        selectionLabel: selectionLabelForType(
          market.marketKey,
          market.line,
          selection.key,
          t,
          { home: fixture.home.name, away: fixture.away.name },
        ),
      };
    }
    return null;
  }, [betSelection, leagues, t]);

  const pick = (fixture: Fixture, market: FixtureMarket, selection: FixtureSelection) => {
    setBetSelection((current) =>
      current?.marketId === market.id && current?.selectionKey === selection.key
        ? current
        : {
            fixtureId: fixture.id,
            marketId: market.id,
            selectionKey: selection.key,
          },
    );
  };

  const isPicked = (market: FixtureMarket, selection: FixtureSelection) =>
    betSelection?.marketId === market.id &&
    betSelection?.selectionKey === selection.key;

  return (
    <div className="min-h-screen bg-arena text-arena-ink">
      <SiteHeader
        game="dota2"
        activeView="all"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />
      <main className="mx-auto max-w-[1320px] px-4 py-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              href="/"
              className="text-xs font-semibold uppercase tracking-[0.18em] text-accent transition hover:text-accent-bright"
            >
              {t("nav.arena")}
            </Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
              {sport === "soccer"
                ? t("sports.title")
                : t("sports.titleBasketball")}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-arena-muted">
              {sport === "soccer"
                ? t("sports.subtitle")
                : t("sports.subtitleBasketball")}
            </p>
          </div>
          <div className="text-right text-xs text-arena-muted">
            <p>
              {data.status === "DOWN"
                ? t("sports.down")
                : `${t("sports.updated")} ${timeLabel(data.updatedAt, language)}`}
            </p>
            <p className="mt-1 font-score tabular-nums">
              {total} {t("sports.matches")}
            </p>
          </div>
        </div>

        <div className="mt-6 inline-flex rounded-xl border border-arena-line bg-arena-surface/60 p-1">
          <SportTab
            active={sport === "soccer"}
            label={t("sports.sport.soccer")}
            onClick={() => selectSport("soccer")}
          />
          <SportTab
            active={sport === "basketball"}
            label={t("sports.sport.basketball")}
            onClick={() => selectSport("basketball")}
          />
        </div>

        {leagues.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <FilterChip
              active={selected === "all"}
              label={t("sports.allLeagues")}
              onClick={() => setSelected("all")}
            />
            {leagues.map((league) => (
              <FilterChip
                key={league.id}
                active={selected === league.id}
                label={league.name}
                onClick={() => setSelected(league.id)}
              />
            ))}
          </div>
        ) : null}

        <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div>
            {visible.length === 0 ? (
              <div className="rounded-2xl border border-arena-line bg-arena-surface/60 p-8 text-center text-sm text-arena-muted">
                {data.status === "DOWN" ? t("sports.down") : t("sports.empty")}
              </div>
            ) : (
              <div className="space-y-10">
                {visible.map((league) => (
                  <section key={league.id}>
                    <div className="flex items-center gap-3">
                      <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-arena-muted">
                        {league.name}
                      </h2>
                      <span className="h-px flex-1 bg-arena-line" />
                    </div>
                    <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                      {league.fixtures.map((fixture) => (
                        <FixtureCard
                          key={`${fixture.leagueId}-${fixture.id}`}
                          fixture={fixture}
                          now={now}
                          onPick={pick}
                          isPicked={isPicked}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            )}
          </div>

          <div className="hidden lg:block">
            <BetSlip
              target={betTarget}
              onClear={() => setBetSelection(null)}
              onLogin={() => openLogin("login")}
              onExplore={() => router.push("/")}
            />
          </div>
        </div>
      </main>
      <SiteFooter variant="dark" />

      {betSelection ? (
        <button
          type="button"
          onClick={() => setBetPanelOpen(true)}
          className="fixed bottom-5 right-5 z-40 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-3 text-sm font-semibold text-navy shadow-lg lg:hidden"
        >
          <TicketIcon className="h-4 w-4" />
          {t("bet.title")}
          <span className="grid h-5 w-5 place-items-center rounded-full bg-navy/15 text-[11px]">
            1
          </span>
        </button>
      ) : null}

      <Modal
        open={betPanelOpen}
        onClose={() => setBetPanelOpen(false)}
        labelledBy="sports-bet-title"
        variant="dark"
        panelClassName="max-w-md w-full"
      >
        <h2 id="sports-bet-title" className="sr-only">
          {t("bet.title")}
        </h2>
        <BetSlip
          compact
          target={betTarget}
          onClear={() => {
            setBetSelection(null);
            setBetPanelOpen(false);
          }}
          onLogin={() => openLogin("login")}
          onExplore={() => router.push("/")}
          onClose={() => setBetPanelOpen(false)}
        />
      </Modal>

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

function toMarket(fixture: Fixture, market: FixtureMarket): Market {
  return {
    id: market.id,
    matchId: `FB:${fixture.id}`,
    marketKey: market.marketKey,
    marketType: market.marketKey,
    title: market.title,
    status: market.status as MarketStatus,
    line: market.line,
    version: market.version,
    updatedAt: new Date().toISOString(),
    selections: market.selections,
  };
}

function SportTab({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg px-4 py-1.5 text-xs font-semibold transition",
        active
          ? "bg-accent text-navy"
          : "text-arena-muted hover:bg-white/5 hover:text-arena-ink",
      )}
    >
      {label}
    </button>
  );
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
        active
          ? "border-accent/40 bg-accent/15 text-accent"
          : "border-arena-line bg-white/[0.03] text-arena-muted hover:bg-white/[0.06] hover:text-arena-ink",
      )}
    >
      {label}
    </button>
  );
}

function FixtureCard({
  fixture,
  now,
  onPick,
  isPicked,
}: {
  fixture: Fixture;
  now: number | null;
  onPick: (fixture: Fixture, market: FixtureMarket, selection: FixtureSelection) => void;
  isPicked: (market: FixtureMarket, selection: FixtureSelection) => boolean;
}) {
  const { t, language } = useLanguage();
  const kickoff = new Date(fixture.kickoff);
  const relative = now === null ? null : countdown(kickoff.getTime() - now, language);
  const started = kickoff.getTime() <= (now ?? Date.now());

  return (
    <article className="flex flex-col rounded-2xl border border-arena-line bg-arena-surface/70 p-4">
      <div className="flex items-center justify-between gap-3 text-[11px] text-arena-muted">
        <span>
          {new Intl.DateTimeFormat(language === "es" ? "es-PE" : "en-US", {
            weekday: "short",
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit",
          }).format(kickoff)}
        </span>
        <span className="rounded-full border border-arena-line px-2 py-0.5 font-semibold uppercase tracking-wide">
          {relative ?? t("sports.scheduled")}
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <TeamRow team={fixture.home} />
        <TeamRow team={fixture.away} />
      </div>

      <div className="mt-4 flex-1 space-y-3 border-t border-arena-line pt-3">
        {fixture.markets.length === 0 ? (
          <p className="text-[11px] text-arena-muted">{t("sports.oddsPending")}</p>
        ) : started ? (
          <p className="text-[11px] text-arena-muted">{t("sports.closed")}</p>
        ) : (
          fixture.markets.map((market) => (
            <div key={market.id}>
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-arena-muted">
                {marketTitle(toMarket(fixture, market), t)}
                {market.line != null ? ` · ${market.line}` : ""}
              </p>
              <div
                className={cn(
                  "mt-1.5 grid gap-1.5",
                  market.selections.length === 2 ? "grid-cols-2" : "grid-cols-3",
                )}
              >
                {market.selections.map((selection) => (
                  <OddsButton
                    key={selection.key}
                    market={toMarket(fixture, market)}
                    selection={selection}
                    size="sm"
                    label={selectionLabelForType(
                      market.marketKey,
                      market.line,
                      selection.key,
                      t,
                      { home: fixture.home.name, away: fixture.away.name },
                    )}
                    selected={isPicked(market, selection)}
                    onSelect={() => onPick(fixture, market, selection)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {fixture.venue ? (
        <p className="mt-3 truncate text-[11px] text-arena-muted">{fixture.venue}</p>
      ) : null}
    </article>
  );
}

function TeamRow({ team }: { team: FixtureTeam }) {
  return (
    <div className="flex items-center gap-3">
      <Crest team={team} />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold">{team.name}</span>
    </div>
  );
}

function Crest({ team }: { team: FixtureTeam }) {
  const [failed, setFailed] = useState(false);
  const initials = team.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();

  if (!team.crestUrl || failed) {
    return (
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-[10px] font-bold text-arena-muted">
        {initials}
      </span>
    );
  }

  return (
    // Las crestas vienen del CDN público de ESPN; CSP permite ese origen.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={team.crestUrl}
      alt=""
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-8 w-8 shrink-0 object-contain"
    />
  );
}

function countdown(diffMillis: number, language: "es" | "en"): string {
  if (diffMillis <= 0) {
    return language === "es" ? "en juego" : "live";
  }
  const minutes = Math.floor(diffMillis / 60_000);
  if (minutes < 60) {
    return language === "es" ? `en ${minutes} min` : `in ${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return language === "es" ? `en ${hours} h` : `in ${hours} h`;
  }
  const days = Math.floor(hours / 24);
  return language === "es" ? `en ${days} d` : `in ${days} d`;
}

function timeLabel(value: string, language: "es" | "en"): string {
  return new Intl.DateTimeFormat(language === "es" ? "es-PE" : "en-US", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
