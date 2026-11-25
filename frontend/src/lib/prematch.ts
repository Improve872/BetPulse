import type { Market } from "@/lib/markets";
import type { Fixture, FixtureMarket } from "@/lib/sports";

export type PublicSport = "football" | "nba";

export function fixtureMarkets(fixture: Fixture): FixtureMarket[] {
  return Array.isArray(fixture.markets) ? fixture.markets : [];
}

export function primaryFixtureMarket(
  fixture: Fixture,
): FixtureMarket | undefined {
  const markets = fixtureMarkets(fixture);
  return (
    markets.find((market) => market.marketKey === "MATCH_RESULT_1X2") ??
    markets.find((market) => market.marketKey === "MATCH_RESULT_2WAY") ??
    markets[0]
  );
}

export function fixtureToMarket(
  fixture: Fixture,
  market: FixtureMarket,
  sport: PublicSport,
): Market {
  return {
    id: market.id,
    matchId: `${sport === "nba" ? "BB" : "FB"}:${fixture.id}`,
    marketKey: market.marketKey,
    marketType: market.marketKey,
    title: market.title,
    status: market.status as Market["status"],
    line: market.line,
    version: market.version,
    updatedAt: new Date().toISOString(),
    selections: market.selections,
  };
}

export function selectionShortLabel(
  marketKey: string,
  selectionKey: string,
  home: string,
  away: string,
  draw: string,
) {
  if (marketKey === "MATCH_RESULT_2WAY" || marketKey === "MATCH_RESULT_1X2") {
    if (selectionKey === "HOME") return { label: "1", name: home };
    if (selectionKey === "DRAW") return { label: "X", name: draw };
    if (selectionKey === "AWAY") return { label: "2", name: away };
  }
  return { label: selectionKey.slice(0, 3), name: selectionKey };
}
