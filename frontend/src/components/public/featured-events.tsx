"use client";

import { Crest } from "@/components/public/crest";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { Market, Selection } from "@/lib/markets";

export type FeaturedEvent = {
  id: string;
  sport: "esports" | "football" | "nba";
  competition: string;
  homeName: string;
  awayName: string;
  homeCrestUrl?: string | null;
  awayCrestUrl?: string | null;
  homeScore?: number | null;
  awayScore?: number | null;
  status: "LIVE" | "SCHEDULED" | "FINISHED";
  meta: string;
  image: string;
  imagePosition?: string;
  market?: Market;
};

function shortTeam(name: string) {
  const [first] = name.trim().split(/\s+/);
  return first && first.length > 0 ? first : name;
}

function selectionLabel(
  sport: FeaturedEvent["sport"],
  event: FeaturedEvent,
  market: Market,
  selection: Selection,
) {
  if (market.marketKey === "MATCH_RESULT_1X2") {
    return selection.key === "HOME" ? "1" : selection.key === "DRAW" ? "X" : "2";
  }
  if (market.marketKey === "MATCH_RESULT_2WAY") {
    return selection.key === "HOME"
      ? shortTeam(event.homeName)
      : shortTeam(event.awayName);
  }
  if (selection.key === "RADIANT") {
    return shortTeam(event.homeName);
  }
  if (selection.key === "DIRE") {
    return shortTeam(event.awayName);
  }
  return selection.key.slice(0, 3);
}

export function FeaturedEvents({
  events,
  selected,
  onOpen,
  onSelect,
}: {
  events: FeaturedEvent[];
  selected?: { id: string; marketId: string; selectionKey: string } | null;
  onOpen: (event: FeaturedEvent) => void;
  onSelect: (event: FeaturedEvent, market: Market, selection: Selection) => void;
}) {
  const { t } = useLanguage();

  if (events.length === 0) {
    return (
      <section className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
        <p className="text-sm font-semibold text-ink">{t("home.hero.empty")}</p>
      </section>
    );
  }

  return (
    <section
      aria-label={t("home.hero.kicker")}
      className="grid grid-cols-1 gap-3 md:grid-cols-3"
    >
      {events.map((event) => {
        const live = event.status === "LIVE";
        const options = event.market?.selections ?? [];

        return (
          <article
            key={event.id}
            data-testid={event.sport === "esports" ? "dota-match" : undefined}
            data-match-id={
              event.sport === "esports" ? event.id.slice(2) : undefined
            }
            className="group relative h-[214px] overflow-hidden rounded-xl bg-navy text-white sm:h-[232px]"
          >
            {/* Fondo local con licencia; no usa next/image para controlar el recorte. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={event.image}
              alt=""
              aria-hidden="true"
              className={cn(
                "absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]",
                event.imagePosition ?? "object-center",
              )}
              loading="lazy"
              decoding="async"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#070d18] via-[#070d18]/45 to-[#070d18]/10"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-r from-[#070d18]/85 via-[#070d18]/25 to-transparent"
            />
            <div
              aria-hidden="true"
              className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/55 to-transparent"
            />

            <div className="relative flex h-full flex-col justify-between p-3">
              <button
                type="button"
                onClick={() => onOpen(event)}
                aria-label={`${t("home.markets")}: ${event.competition}`}
                className="block w-full text-left outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <p className="flex flex-wrap items-center gap-x-1.5 text-[12px] leading-4">
                  <span className="font-bold text-white">{event.competition}</span>
                  <span aria-hidden="true" className="text-white/35">
                    /
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      live ? "text-accent" : "text-white/75",
                    )}
                  >
                    {live
                      ? `${t("home.status.live")} · ${event.meta}`
                      : event.meta}
                  </span>
                </p>

                <div className="mt-2.5 space-y-1">
                  <TeamRow
                    name={event.homeName}
                    url={event.homeCrestUrl}
                    score={event.homeScore}
                  />
                  <TeamRow
                    name={event.awayName}
                    url={event.awayCrestUrl}
                    score={event.awayScore}
                  />
                </div>
              </button>

              {options.length > 0 ? (
                <div
                  className="mt-3 grid gap-1.5"
                  style={{
                    gridTemplateColumns: `repeat(${Math.min(options.length, 3)}, minmax(0, 1fr))`,
                  }}
                >
                  {options.slice(0, 3).map((selection) => {
                    const isSelected =
                      selected?.id === event.id.slice(2) &&
                      selected.marketId === event.market?.id &&
                      selected.selectionKey === selection.key;
                    const label = selectionLabel(
                      event.sport,
                      event,
                      event.market!,
                      selection,
                    );
                    return (
                      <button
                        key={selection.key}
                        type="button"
                        aria-pressed={isSelected}
                        aria-label={`${event.homeName} vs ${event.awayName}: ${label} ${selection.odds.toFixed(2)}`}
                        disabled={event.market?.status !== "OPEN"}
                        onClick={() =>
                          event.market && onSelect(event, event.market, selection)
                        }
                        className={cn(
                          "flex h-11 flex-col items-center justify-center rounded-md border leading-none transition disabled:cursor-not-allowed disabled:opacity-60",
                          isSelected
                            ? "border-accent bg-accent text-masthead"
                            : "border-white/10 bg-white text-ink hover:bg-white/90",
                        )}
                      >
                        <span
                          className={cn(
                            "max-w-full truncate px-1 text-[10px] font-medium",
                            isSelected ? "text-masthead/70" : "text-muted",
                          )}
                        >
                          {label}
                        </span>
                        <span className="mt-1 font-score text-[16px] font-bold tabular-nums">
                          {selection.odds.toFixed(2)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </section>
  );
}

function TeamRow({
  name,
  url,
  score,
}: {
  name: string;
  url?: string | null;
  score?: number | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <Crest name={name} url={url} size="xs" tone="dark" />
      <span className="min-w-0 flex-1 truncate text-[17px] font-bold leading-5 text-white">
        {name}
      </span>
      {typeof score === "number" ? (
        <span className="font-score text-sm font-semibold tabular-nums text-white/85">
          {score}
        </span>
      ) : null}
    </div>
  );
}
