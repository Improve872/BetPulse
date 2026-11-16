const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8081").replace(
  /\/$/,
  "",
);

export type FixtureTeam = {
  id: number;
  name: string;
  shortName: string | null;
  abbreviation: string | null;
  crestUrl: string | null;
};

export type Fixture = {
  id: string;
  leagueId: string;
  leagueName: string;
  kickoff: string;
  state: "SCHEDULED" | "LIVE" | "FINISHED";
  statusDetail: string | null;
  home: FixtureTeam;
  away: FixtureTeam;
  homeScore: number | null;
  awayScore: number | null;
  venue: string | null;
};

export type LeagueFixtures = {
  id: string;
  name: string;
  fixtures: Fixture[];
};

export type FixturesResponse = {
  sport: string;
  updatedAt: string;
  status: "LIVE" | "STALE" | "DOWN";
  lastSuccessAt: string | null;
  lastError: string | null;
  leagues: LeagueFixtures[];
};

export async function getFixtures(): Promise<FixturesResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/sports/fixtures`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return unavailableFixtures();
    }

    const data = (await response.json()) as FixturesResponse;
    return {
      sport: data.sport ?? "SOCCER",
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      status: data.status ?? "DOWN",
      lastSuccessAt: data.lastSuccessAt ?? null,
      lastError: data.lastError ?? null,
      leagues: Array.isArray(data.leagues)
        ? data.leagues.map((league) => ({
            id: league.id,
            name: league.name,
            fixtures: Array.isArray(league.fixtures) ? league.fixtures : [],
          }))
        : [],
    };
  } catch {
    return unavailableFixtures();
  }
}

function unavailableFixtures(): FixturesResponse {
  return {
    sport: "SOCCER",
    updatedAt: new Date().toISOString(),
    status: "DOWN",
    lastSuccessAt: null,
    lastError: "Backend no disponible.",
    leagues: [],
  };
}
