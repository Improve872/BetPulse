import type { FeedStatus } from "@/lib/lobby";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8081").replace(
  /\/$/,
  "",
);

export type MarketStatus =
  | "SCHEDULED"
  | "OPEN"
  | "SUSPENDED"
  | "CLOSED"
  | "SETTLED"
  | "VOID";

export type Selection = {
  key: string;
  label: string;
  probability: number;
  odds: number;
};

export type Market = {
  id: string;
  matchId: string;
  marketKey: string;
  marketType: string;
  title: string;
  status: MarketStatus;
  version: number;
  suspensionReason?: string;
  updatedAt: string;
  selections: Selection[];
};

export type LiveMarketsData = {
  markets: Market[];
  updatedAt: string;
};

export type MarketFeed = {
  status: FeedStatus;
  connected: boolean;
};

export async function getLiveMarkets(): Promise<LiveMarketsData> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/markets/live`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return emptyMarkets();
    }

    const data = (await response.json()) as LiveMarketsData;
    return {
      markets: Array.isArray(data.markets) ? data.markets : [],
      updatedAt: data.updatedAt ?? new Date().toISOString(),
    };
  } catch {
    return emptyMarkets();
  }
}

export function emptyMarkets(): LiveMarketsData {
  return { markets: [], updatedAt: new Date().toISOString() };
}

export function indexMarkets(data: LiveMarketsData): Map<string, Market> {
  return new Map(data.markets.map((market) => [market.matchId, market]));
}
