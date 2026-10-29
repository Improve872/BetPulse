import type { FeedStatus } from "@/lib/lobby";
import type { TranslationKey } from "@/lib/i18n";

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
  line?: number | null;
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

type Translate = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;

export function indexMarkets(data: LiveMarketsData): Map<string, Market[]> {
  const result = new Map<string, Market[]>();
  for (const market of data.markets) {
    const current = result.get(market.matchId) ?? [];
    current.push(market);
    result.set(market.matchId, current);
  }
  return result;
}

export function primaryMarket(markets?: Market[]): Market | undefined {
  return markets?.find((market) => market.marketKey === "MATCH_WINNER") ??
    markets?.[0];
}

export function marketTitle(market: Market, t: Translate): string {
  return marketTitleForType(market.marketKey, market.title, t);
}

export function marketTitleForType(
  marketType: string,
  fallback: string,
  t: Translate,
): string {
  switch (marketType) {
    case "MATCH_WINNER":
      return t("market.title.MATCH_WINNER");
    case "TOTAL_KILLS":
      return t("market.title.TOTAL_KILLS");
    case "KILL_HANDICAP":
      return t("market.title.KILL_HANDICAP");
    case "DURATION":
      return t("market.title.DURATION");
    default:
      return fallback;
  }
}

export function selectionLabel(
  market: Market,
  selectionKey: string,
  t: Translate,
): string {
  return selectionLabelForType(
    market.marketKey,
    market.line,
    selectionKey,
    t,
  );
}

export function selectionLabelForType(
  marketType: string,
  lineValue: number | null | undefined,
  selectionKey: string,
  t: Translate,
): string {
  const line = Number(lineValue ?? 0);
  const lineLabel = Number.isFinite(line) ? line.toFixed(1) : "—";

  switch (marketType) {
    case "MATCH_WINNER":
      return selectionKey === "RADIANT" ? t("market.radiant") : t("market.dire");
    case "TOTAL_KILLS":
      return selectionKey === "OVER"
        ? t("market.overLine", { line: lineLabel })
        : t("market.underLine", { line: lineLabel });
    case "DURATION":
      return selectionKey === "OVER"
        ? t("market.overMinutes", { line: lineLabel })
        : t("market.underMinutes", { line: lineLabel });
    case "KILL_HANDICAP": {
      const radiantLine = `${line >= 0 ? "-" : "+"}${Math.abs(line).toFixed(1)}`;
      const direLine = `${line >= 0 ? "+" : "-"}${Math.abs(line).toFixed(1)}`;
      return selectionKey === "RADIANT"
        ? t("market.handicapRadiant", { line: radiantLine })
        : t("market.handicapDire", { line: direLine });
    }
    default:
      return selectionKey;
  }
}
