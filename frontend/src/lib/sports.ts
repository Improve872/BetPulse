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

export type FixtureSelection = {
  key: string;
  label: string;
  probability: number;
  odds: number;
};

export type FixtureMarket = {
  id: string;
  marketKey: string;
  title: string;
  line: number | null;
  version: number;
  status: string;
  selections: FixtureSelection[];
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
  markets: FixtureMarket[];
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
  return fetchFixtures("/api/sports/fixtures", "SOCCER");
}

export async function getBasketballFixtures(): Promise<FixturesResponse> {
  return fetchFixtures("/api/sports/basketball/fixtures", "BASKETBALL");
}

async function fetchFixtures(
  path: string,
  sport: string,
): Promise<FixturesResponse> {
  try {
    const response = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return unavailableFixtures(sport);
    }

    const data = (await response.json()) as FixturesResponse;
    return {
      sport: data.sport ?? sport,
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      status: data.status ?? "DOWN",
      lastSuccessAt: data.lastSuccessAt ?? null,
      lastError: data.lastError ?? null,
      leagues: Array.isArray(data.leagues)
        ? data.leagues.map((league) => ({
            id: league.id,
            name: league.name,
            fixtures: Array.isArray(league.fixtures)
              ? league.fixtures.map((fixture) => ({
                  ...fixture,
                  markets: Array.isArray(fixture.markets) ? fixture.markets : [],
                }))
              : [],
          }))
        : [],
    };
  } catch {
    return unavailableFixtures(sport);
  }
}

function unavailableFixtures(sport: string): FixturesResponse {
  return {
    sport,
    updatedAt: new Date().toISOString(),
    status: "DOWN",
    lastSuccessAt: null,
    lastError: "Backend no disponible.",
    leagues: [],
  };
}
