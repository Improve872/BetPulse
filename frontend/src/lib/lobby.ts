export type GameId = "dota2" | "cs2" | "lol" | "valorant";

export type LobbyView = "all" | "live" | "results" | "upcoming";

export type MatchState = "live" | "finished";

export type TeamSide = "radiant" | "dire";

export type LobbyTeam = {
  name: string;
  score: number;
  side: TeamSide;
  winner?: boolean;
  teamId?: number | null;
};

export type LobbyMatch = {
  id: string;
  game: GameId;
  state: MatchState;
  tournament: string;
  tournamentKind?: "pro" | "ranked" | "gsi";
  format: string;
  startedAt: number;
  durationSeconds: number;
  radiant: LobbyTeam;
  dire: LobbyTeam;
  averageMmr?: number;
  spectators?: number;
  delaySeconds?: number;
  source?: "OPENDOTA" | "GSI";
  playersScope?: "FULL" | "LOCAL";
  paused?: boolean;
  roshanAvailable?: boolean;
  stream?: LobbyStream;
};

export type LobbyData = {
  live: LobbyMatch[];
  recent: LobbyMatch[];
  updatedAt: string;
  feed?: FeedHealth;
};

export type StreamProvider = "TWITCH" | "YOUTUBE";

export type LobbyStream = {
  provider: StreamProvider;
  channelOrVideo: string;
  label?: string | null;
  fallbackUrl?: string | null;
};

export type FeedStatus = "STARTING" | "LIVE" | "DEGRADED" | "STALE" | "DOWN";

export type FeedHealth = {
  source: string;
  status: FeedStatus;
  lastSuccessAt?: string;
  lastAttemptAt?: string;
  nextAttemptAt?: string;
  consecutiveFailures: number;
  lastError?: string;
  stale: boolean;
};
