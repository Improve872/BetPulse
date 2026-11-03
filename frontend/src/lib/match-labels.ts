import type { TranslationKey } from "@/lib/i18n";
import type { LobbyMatch } from "@/lib/lobby";
import { selectionLabel, type Market } from "@/lib/markets";

type Translate = (
  key: TranslationKey,
  values?: Record<string, string | number>,
) => string;

export function matchTournamentLabel(match: LobbyMatch, t: Translate): string {
  if (match.tournament) {
    return match.tournament;
  }
  if (match.tournamentKind === "ranked") {
    return t("match.ranked");
  }
  if (match.tournamentKind === "gsi") {
    return t("match.gsi");
  }
  return t("match.pro");
}

export function matchSourceLabel(match: LobbyMatch, t: Translate): string {
  if (match.source !== "GSI") {
    return "";
  }
  return match.playersScope === "LOCAL"
    ? t("match.practice")
    : t("match.spectating");
}

export function matchSelectionLabel(
  match: LobbyMatch,
  market: Market,
  selectionKey: string,
  t: Translate,
): string {
  if (market.marketKey === "MATCH_WINNER") {
    if (selectionKey.toUpperCase() === "RADIANT") {
      return match.radiant.name;
    }
    if (selectionKey.toUpperCase() === "DIRE") {
      return match.dire.name;
    }
  }
  return selectionLabel(market, selectionKey, t);
}
