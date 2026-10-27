export type GameId = "dota2" | "cs2" | "lol" | "valorant";

export type LobbyView = "all" | "live" | "results" | "upcoming";

export type MatchState = "live" | "finished";

export type TeamSide = "radiant" | "dire";

export type LobbyTeam = {
  name: string;
  score: number;
  side: TeamSide;
  winner?: boolean;
};

export type LobbyMatch = {
  id: string;
  game: GameId;
  state: MatchState;
  tournament: string;
  tournamentKind?: "pro" | "ranked";
  format: string;
  startedAt: number;
  durationSeconds: number;
  radiant: LobbyTeam;
  dire: LobbyTeam;
  averageMmr?: number;
  spectators?: number;
  delaySeconds?: number;
};

export type LobbyData = {
  live: LobbyMatch[];
  recent: LobbyMatch[];
  updatedAt: string;
};
