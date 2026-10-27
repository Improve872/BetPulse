import type { GameId } from "@/lib/lobby";

export type GameOption = {
  id: GameId;
  name: string;
  mark: string;
  available: boolean;
};

export const games: GameOption[] = [
  { id: "dota2", name: "Dota 2", mark: "D2", available: true },
  { id: "cs2", name: "Counter-Strike 2", mark: "CS", available: false },
  { id: "lol", name: "League of Legends", mark: "LoL", available: false },
  { id: "valorant", name: "VALORANT", mark: "VAL", available: false },
];
