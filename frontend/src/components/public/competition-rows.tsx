"use client";

import {
  BasketballIcon,
  FootballIcon,
  GamepadIcon,
} from "@/components/icons";
import { Crest } from "@/components/public/crest";
import { cn, formatGameTime, kickoffTiming } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyMatch } from "@/lib/lobby";
import type { Market, Selection } from "@/lib/markets";
import {
  primaryFixtureMarket,
  type PublicSport,
} from "@/lib/prematch";
import type { Fixture, FixtureMarket, FixtureSelection } from "@/lib/sports";

export type FixtureRow = { kind: "fixture"; fixture: Fixture; sport: PublicSport };
export type DotaRow = { kind: "dota"; match: LobbyMatch; markets: Market[] };
export type EventRow = FixtureRow | DotaRow;

export type CompetitionSection = {
  id: string;
  name: string;
  sport: PublicSport | "esports";
  rows: EventRow[];
};

type Selected = {
  kind: "fixture" | "dota";
  id: string;
  marketId: string;
  selectionKey: string;
} | null;

const cellWidth = "md:w-[88px] md:flex-none";
const primaryWidth = "md:w-[242px] md:flex-none";
const pairWidth = "md:w-[180px] md:flex-none";

function gridColumns(sport: CompetitionSection["sport"]) {
  if (sport === "football") {
    return "minmax(0,1fr) 242px 180px";
  }
  if (sport === "nba") {
    return "minmax(0,1fr) 180px 180px";
  }
  return "minmax(0,1fr) 180px 180px 180px";
}

export function CompetitionRows({
  sections,
  selected,
  onFixtureSelect,
  onFixtureOpen,
  onDotaSelect,
  onDotaOpen,
}: {
  sections: CompetitionSection[];
  selected: Selected;
  onFixtureSelect: (
    fixture: Fixture,
    market: FixtureMarket,
    selection: FixtureSelection,
    sport: PublicSport,
  ) => void;
  onFixtureOpen: (fixture: Fixture, sport: PublicSport) => void;
  onDotaSelect: (match: LobbyMatch, market: Market, selection: Selection) => void;
  onDotaOpen: (match: LobbyMatch) => void;
}) {
  const { t } = useLanguage();

  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <section
          key={section.id}
          className="overflow-hidden rounded-xl border border-line bg-white"
        >
          <div
            className="hidden items-center gap-4 border-b border-line bg-[#f5f8fb] px-4 md:grid"
            style={{ gridTemplateColumns: gridColumns(section.sport) }}
          >
            <div className="flex min-w-0 items-center gap-2.5 py-2">
              <SportMark sport={section.sport} />
              <h3 className="truncate text-[15px] font-bold text-ink">
                {section.name}
              </h3>
            </div>
            <MarketLabels sport={section.sport} />
          </div>

          <div className="flex items-center gap-2.5 border-b border-line bg-[#f5f8fb] px-4 py-2 md:hidden">
            <SportMark sport={section.sport} />
            <h3 className="truncate text-[15px] font-bold text-ink">
              {section.name}
            </h3>
            <span className="ml-auto text-[11px] font-semibold text-muted">
              {section.rows.length}
            </span>
          </div>

          <ul>
            {section.rows.map((row) => (
              <li key={rowId(row)} className="border-b border-line last:border-0">
                {row.kind === "fixture" ? (
                  <FixtureLine
                    row={row}
                    selected={selected}
                    onSelect={onFixtureSelect}
                    onOpen={onFixtureOpen}
                  />
                ) : (
                  <DotaLine
                    row={row}
                    selected={selected}
                    onSelect={onDotaSelect}
                    onOpen={onDotaOpen}
                  />
                )}
              </li>
            ))}
          </ul>

          {section.rows.length === 0 ? (
            <p className="px-4 py-6 text-center text-xs text-muted">
              {t("home.empty.section")}
            </p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

function MarketLabels({ sport }: { sport: CompetitionSection["sport"] }) {
  const { t } = useLanguage();

  if (sport === "football") {
    return (
      <>
        <div className="flex gap-1">
          {["1", "X", "2"].map((label) => (
            <span
              key={label}
              className="w-[78px] text-center text-[12px] font-semibold text-muted"
            >
              {label}
            </span>
          ))}
        </div>
        <span className="w-[180px] text-center text-[12px] font-semibold text-muted">
          {t("market.title.TOTAL_GOALS")}
        </span>
      </>
    );
  }

  if (sport === "nba") {
    return (
      <>
        <span className="w-[180px] text-center text-[12px] font-semibold text-muted">
          {t("market.title.MATCH_RESULT_2WAY")}
        </span>
        <span className="w-[180px] text-center text-[12px] font-semibold text-muted">
          {t("market.title.TOTAL_POINTS")}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="w-[180px] text-center text-[12px] font-semibold text-muted">
        {t("market.title.MATCH_RESULT_2WAY")}
      </span>
      <span className="w-[180px] text-center text-[12px] font-semibold text-muted">
        {t("market.title.TOTAL_KILLS")}
      </span>
      <span className="w-[180px] text-center text-[12px] font-semibold text-muted">
        {t("market.title.DURATION")}
      </span>
    </>
  );
}

function FixtureLine({
  row,
  selected,
  onSelect,
  onOpen,
}: {
  row: FixtureRow;
  selected: Selected;
  onSelect: (
    fixture: Fixture,
    market: FixtureMarket,
    selection: FixtureSelection,
    sport: PublicSport,
  ) => void;
  onOpen: (fixture: Fixture, sport: PublicSport) => void;
}) {
  const { t, language } = useLanguage();
  const { fixture, sport } = row;
  const primary = primaryFixtureMarket(fixture);
  const totals = fixture.markets.find((market) =>
    market.marketKey.startsWith("TOTAL_"),
  );
  const timing = kickoffTiming(fixture.kickoff, language);
  const dayLabel =
    timing.day === "today"
      ? t("home.filter.today")
      : timing.day === "tomorrow"
        ? t("home.filter.tomorrow")
        : timing.weekday;

  return (
    <div
      className="flex flex-col gap-2 px-4 py-2.5 transition hover:bg-paper-soft/70 md:grid md:min-h-[78px] md:items-center md:gap-4"
      style={{ gridTemplateColumns: gridColumns(sport) }}
    >
      <button
        type="button"
        onClick={() => onOpen(fixture, sport)}
        aria-label={`${t("home.markets")}: ${fixture.home.name} vs ${fixture.away.name}`}
        className="flex min-w-0 items-center gap-3 text-left md:max-w-[340px]"
      >
        <span className="w-11 shrink-0 leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-subtle">
            {dayLabel}
          </span>
          <span className="block text-[12px] font-semibold tabular-nums text-ink">
            {timing.time}
          </span>
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <TeamLine name={fixture.home.name} url={fixture.home.crestUrl} />
          <TeamLine name={fixture.away.name} url={fixture.away.crestUrl} />
        </div>
      </button>

      <div className="flex gap-2 md:contents">
        {primary ? (
          <div
            className={cn(
              "flex flex-1 gap-1",
              primary.selections.length > 2 ? primaryWidth : pairWidth,
            )}
          >
            {primary.selections.map((selection) => (
              <OddCell
                key={selection.key}
                label={
                  primary.marketKey === "MATCH_RESULT_1X2"
                    ? undefined
                    : selection.key === "HOME"
                      ? (fixture.home.shortName ?? fixture.home.name)
                      : (fixture.away.shortName ?? fixture.away.name)
                }
                odds={selection.odds}
                disabled={primary.status !== "OPEN"}
                widthClass={
                  primary.selections.length > 2 ? "md:w-[78px]" : cellWidth
                }
                selected={
                  selected?.kind === "fixture" &&
                  selected.id === fixture.id &&
                  selected.marketId === primary.id &&
                  selected.selectionKey === selection.key
                }
                onClick={() => onSelect(fixture, primary, selection, sport)}
              />
            ))}
          </div>
        ) : null}

        {totals ? (
          <div className={cn("flex flex-1 gap-1", pairWidth)}>
            {totals.selections.map((selection) => (
              <OddCell
                key={selection.key}
                label={totalLabel(selection.key, totals.line)}
                odds={selection.odds}
                disabled={totals.status !== "OPEN"}
                widthClass={cellWidth}
                selected={
                  selected?.kind === "fixture" &&
                  selected.id === fixture.id &&
                  selected.marketId === totals.id &&
                  selected.selectionKey === selection.key
                }
                onClick={() => onSelect(fixture, totals, selection, sport)}
              />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function DotaLine({
  row,
  selected,
  onSelect,
  onOpen,
}: {
  row: DotaRow;
  selected: Selected;
  onSelect: (match: LobbyMatch, market: Market, selection: Selection) => void;
  onOpen: (match: LobbyMatch) => void;
}) {
  const { t } = useLanguage();
  const { match, markets } = row;
  const winner = markets.find((market) => market.marketKey === "MATCH_WINNER");
  const kills = markets.find((market) => market.marketKey === "TOTAL_KILLS");
  const duration = markets.find((market) => market.marketKey === "DURATION");

  const group = (
    market: Market | undefined,
    kind: "winner" | "kills" | "duration",
  ) =>
    market ? (
      <div className={cn("flex flex-1 gap-1", pairWidth)}>
        {market.selections.map((selection) => (
          <OddCell
            key={selection.key}
            label={
              kind === "winner"
                ? selection.key === "RADIANT"
                  ? match.radiant.name
                  : match.dire.name
                : kind === "kills"
                  ? totalLabel(selection.key, market.line)
                  : `${selection.key === "OVER" ? "Más" : "Menos"} ${
                      market.line != null ? Number(market.line).toFixed(0) : ""
                    }m`
            }
            odds={selection.odds}
            disabled={market.status !== "OPEN"}
            widthClass={cellWidth}
            selected={
              selected?.kind === "dota" &&
              selected.id === match.id &&
              selected.marketId === market.id &&
              selected.selectionKey === selection.key
            }
            onClick={() => onSelect(match, market, selection)}
          />
        ))}
      </div>
    ) : null;

  return (
    <div
      className="flex flex-col gap-2 px-4 py-2.5 transition hover:bg-paper-soft/70 md:grid md:min-h-[78px] md:items-center md:gap-4"
      style={{ gridTemplateColumns: gridColumns("esports") }}
    >
      <button
        type="button"
        onClick={() => onOpen(match)}
        aria-label={`${t("home.markets")}: ${match.radiant.name} vs ${match.dire.name}`}
        className="flex min-w-0 items-center gap-3 text-left md:max-w-[340px]"
      >
        <span className="w-11 shrink-0 leading-tight">
          <span className="block text-[10px] font-semibold uppercase tracking-wide text-live">
            {t("home.status.live")}
          </span>
          <span className="block text-[12px] font-semibold tabular-nums text-ink">
            {formatGameTime(match.durationSeconds)}
          </span>
        </span>
        <div className="min-w-0 flex-1 space-y-1">
          <ScoreLine team={match.radiant} />
          <ScoreLine team={match.dire} />
        </div>
      </button>

      <div className="flex gap-2 md:contents">
        {group(winner, "winner")}
        {group(kills, "kills")}
        {group(duration, "duration")}
      </div>
    </div>
  );
}

function TeamLine({ name, url }: { name: string; url?: string | null }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Crest name={name} url={url} size="xs" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-ink">
        {name}
      </span>
    </div>
  );
}

function ScoreLine({ team }: { team: LobbyMatch["radiant"] }) {
  const url = team.teamId ? `/api/catalog/teams/${team.teamId}/logo` : null;
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Crest name={team.name} url={url} size="xs" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-semibold leading-5 text-ink">
        {team.name}
      </span>
      <span className="font-score text-[13px] font-semibold tabular-nums text-ink">
        {team.score}
      </span>
    </div>
  );
}

function OddCell({
  label,
  odds,
  selected,
  disabled,
  widthClass,
  onClick,
}: {
  label?: string;
  odds: number;
  selected?: boolean;
  disabled?: boolean;
  widthClass?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${label ? `${label} ` : ""}${odds.toFixed(2)}`}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-11 flex-1 flex-col items-center justify-center rounded-md border px-1 leading-none transition",
        widthClass,
        disabled
          ? "cursor-not-allowed border-line bg-paper-soft text-subtle"
          : selected
            ? "border-accent bg-accent text-masthead"
            : "border-line/80 bg-paper text-ink hover:border-accent/50 hover:bg-white",
      )}
    >
      {label ? (
        <span
          className={cn(
            "max-w-full truncate text-[10px] font-medium",
            selected ? "text-masthead/70" : "text-muted",
          )}
        >
          {label}
        </span>
      ) : null}
      <span
        className={cn(
          "font-score text-[16px] font-bold tabular-nums",
          label ? "mt-0.5" : "",
        )}
      >
        {odds.toFixed(2)}
      </span>
    </button>
  );
}

function SportMark({ sport }: { sport: CompetitionSection["sport"] }) {
  const base =
    "grid h-6 w-6 shrink-0 place-items-center rounded-md";
  if (sport === "nba") {
    return (
      <span className={cn(base, "bg-court-soft text-court")}>
        <BasketballIcon className="h-4 w-4" />
      </span>
    );
  }
  if (sport === "football") {
    return (
      <span className={cn(base, "bg-pitch-soft text-pitch")}>
        <FootballIcon className="h-4 w-4" />
      </span>
    );
  }
  return (
    <span className={cn(base, "bg-accent/12 text-accent-strong")}>
      <GamepadIcon className="h-4 w-4" />
    </span>
  );
}

function totalLabel(selectionKey: string, line?: number | null) {
  const value = line != null ? Number(line).toFixed(1) : "";
  return `${selectionKey === "OVER" ? "Más" : "Menos"} ${value}`.trim();
}

function rowId(row: EventRow) {
  return row.kind === "fixture" ? `f:${row.fixture.id}` : `d:${row.match.id}`;
}
