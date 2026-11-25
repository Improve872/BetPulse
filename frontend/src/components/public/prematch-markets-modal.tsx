"use client";

import { CloseIcon } from "@/components/icons";
import { Modal } from "@/components/modal";
import { Crest } from "@/components/public/crest";
import { PricePill } from "@/components/public/price-pill";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import { marketTitle } from "@/lib/markets";
import {
  fixtureMarkets,
  fixtureToMarket,
  selectionShortLabel,
  type PublicSport,
} from "@/lib/prematch";
import type { Fixture, FixtureMarket, FixtureSelection } from "@/lib/sports";

export function PrematchMarketsModal({
  fixture,
  sport,
  selected,
  onSelect,
  onClose,
}: {
  fixture: Fixture;
  sport: PublicSport;
  selected?: { marketId: string; selectionKey: string } | null;
  onSelect: (
    fixture: Fixture,
    market: FixtureMarket,
    selection: FixtureSelection,
  ) => void;
  onClose: () => void;
}) {
  const { t, language } = useLanguage();
  const markets = fixtureMarkets(fixture);
  const kickoff = new Date(fixture.kickoff);
  const dateLabel = new Intl.DateTimeFormat(
    language === "es" ? "es-PE" : "en-US",
    {
      weekday: "short",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    },
  ).format(kickoff);
  const statusLabel =
    fixture.state === "LIVE"
      ? t("home.status.live")
      : fixture.state === "FINISHED"
        ? t("home.status.finished")
        : t("home.status.scheduled");

  return (
    <Modal
      open
      onClose={onClose}
      labelledBy="prematch-title"
      panelClassName="sm:max-w-2xl"
    >
      <div className="border-b border-line bg-navy px-5 py-4 text-white sm:px-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-accent-bright">
              {fixture.leagueName}
            </p>
            <h2
              id="prematch-title"
              className="mt-1 font-headline text-lg font-semibold leading-tight sm:text-xl"
            >
              {fixture.home.name} vs {fixture.away.name}
            </h2>
            <p className="mt-1 text-xs text-white/65">
              {dateLabel} · {statusLabel}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("match.close")}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex items-center justify-center gap-4 sm:gap-8">
          <TeamHead name={fixture.home.name} url={fixture.home.crestUrl} />
          <span className="font-score text-xl font-semibold text-white/40">
            VS
          </span>
          <TeamHead name={fixture.away.name} url={fixture.away.crestUrl} />
        </div>
      </div>

      <div className="space-y-4 p-5 sm:p-6">
        {markets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-line bg-paper-soft p-6 text-center">
            <p className="text-sm font-semibold text-ink">
              {t("match.marketsEmptyTitle")}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted">
              {t("match.marketsEmptyBody")}
            </p>
          </div>
        ) : (
          markets.map((fixtureMarket) => {
            const market = fixtureToMarket(fixture, fixtureMarket, sport);
            const isSelected = selected?.marketId === market.id;
            return (
              <section
                key={market.id}
                className={cn(
                  "rounded-2xl border p-4",
                  isSelected
                    ? "border-accent/50 bg-accent/[0.04]"
                    : "border-line bg-paper-soft/60",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-ink">
                      {marketTitle(market, t)}
                    </p>
                    {market.line != null ? (
                      <p className="mt-0.5 text-[11px] text-muted">
                        {t("market.line", {
                          line: Number(market.line).toFixed(1),
                        })}
                      </p>
                    ) : null}
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
                      market.status === "OPEN"
                        ? "bg-pitch-soft text-pitch"
                        : "bg-paper text-muted",
                    )}
                  >
                    {market.status === "OPEN"
                      ? t("market.open")
                      : t("market.closed")}
                  </span>
                </div>

                <div
                  className={cn(
                    "mt-3 grid gap-2",
                    fixtureMarket.selections.length === 3
                      ? "grid-cols-3"
                      : "grid-cols-2",
                  )}
                >
                  {fixtureMarket.selections.map((selection) => {
                    const short = market.marketKey.startsWith("TOTAL_")
                      ? { label: selection.label, name: selection.label }
                      : selectionShortLabel(
                          market.marketKey,
                          selection.key,
                          fixture.home.name,
                          fixture.away.name,
                          t("sports.selection.draw"),
                        );
                    return (
                      <PricePill
                        key={selection.key}
                        label={short.label}
                        odds={selection.odds}
                        ariaLabel={`${short.name} ${selection.odds}`}
                        disabled={market.status !== "OPEN"}
                        selected={
                          selected?.marketId === market.id &&
                          selected?.selectionKey === selection.key
                        }
                        onClick={() => onSelect(fixture, fixtureMarket, selection)}
                      />
                    );
                  })}
                </div>
              </section>
            );
          })
        )}

        {selected ? (
          <p className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-xs font-semibold text-accent-strong">
            {t("home.selected")}
          </p>
        ) : null}

        <p className="text-[11px] leading-4 text-muted">{t("market.oddsNote")}</p>
      </div>
    </Modal>
  );
}

function TeamHead({ name, url }: { name: string; url?: string | null }) {
  return (
    <div className="flex min-w-0 max-w-[40%] flex-col items-center gap-1.5 text-center">
      <Crest
        name={name}
        url={url}
        size="lg"
        tone="dark"
        rounded="full"
      />
      <span className="line-clamp-2 text-xs font-semibold leading-4 text-white/90">
        {name}
      </span>
    </div>
  );
}
