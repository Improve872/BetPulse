import type { LobbyData, LobbyMatch } from "@/lib/lobby";

const OPENDOTA_API = "https://api.opendota.com/api";

type OpenDotaLiveMatch = {
  match_id: number;
  league_id: number;
  activate_time: number;
  deactivate_time: number;
  game_time: number;
  delay: number;
  spectators: number;
  average_mmr: number;
  radiant_score: number;
  dire_score: number;
  team_name_radiant: string;
  team_name_dire: string;
  is_watch_eligible: boolean;
};

type OpenDotaProMatch = {
  match_id: number;
  duration: number;
  start_time: number;
  radiant_name: string;
  dire_name: string;
  league_name: string;
  series_type: number;
  radiant_score: number;
  dire_score: number;
  radiant_win: boolean;
};

async function getJson<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${OPENDOTA_API}${path}`, {
      headers: { Accept: "application/json" },
      next: { revalidate: 30 },
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return null;
    }

    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function seriesFormat(seriesType: number): string {
  if (seriesType === 0) {
    return "BO1";
  }
  if (seriesType === 1) {
    return "BO3";
  }
  if (seriesType === 2) {
    return "BO5";
  }
  return "";
}

function mapLiveMatch(match: OpenDotaLiveMatch): LobbyMatch {
  const radiantName = match.team_name_radiant?.trim() || "Radiant";
  const direName = match.team_name_dire?.trim() || "Dire";

  return {
    id: String(match.match_id),
    game: "dota2",
    state: "live",
    tournament: "",
    tournamentKind: match.league_id > 0 ? "pro" : "ranked",
    format: "",
    startedAt: match.activate_time,
    durationSeconds: match.game_time,
    radiant: { name: radiantName, score: match.radiant_score, side: "radiant" },
    dire: { name: direName, score: match.dire_score, side: "dire" },
    averageMmr: match.average_mmr || undefined,
    spectators: match.spectators || undefined,
    delaySeconds: match.delay || undefined,
  };
}

function mapProMatch(match: OpenDotaProMatch): LobbyMatch {
  return {
    id: String(match.match_id),
    game: "dota2",
    state: "finished",
    tournament: match.league_name?.trim() || "",
    tournamentKind: "pro",
    format: seriesFormat(match.series_type),
    startedAt: match.start_time,
    durationSeconds: match.duration,
    radiant: {
      name: match.radiant_name,
      score: match.radiant_score,
      side: "radiant",
      winner: match.radiant_win,
    },
    dire: {
      name: match.dire_name,
      score: match.dire_score,
      side: "dire",
      winner: !match.radiant_win,
    },
  };
}

export async function getLobbyData(): Promise<LobbyData> {
  const [liveRaw, proRaw] = await Promise.all([
    getJson<OpenDotaLiveMatch[]>("/live"),
    getJson<OpenDotaProMatch[]>("/proMatches"),
  ]);

  const live = (liveRaw ?? [])
    .filter(
      (match) =>
        match.is_watch_eligible &&
        match.game_time > 0 &&
        match.deactivate_time === 0,
    )
    .sort(
      (a, b) =>
        b.spectators - a.spectators || b.average_mmr - a.average_mmr,
    )
    .slice(0, 6)
    .map(mapLiveMatch);

  const recent = (proRaw ?? [])
    .filter((match) => match.radiant_name && match.dire_name)
    .sort((a, b) => b.start_time - a.start_time)
    .slice(0, 8)
    .map(mapProMatch);

  return {
    live,
    recent,
    updatedAt: new Date().toISOString(),
  };
}
