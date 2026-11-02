"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import type { LobbyMatch } from "@/lib/lobby";

export type MatchEvent = {
  id: string;
  type: string;
  clockTime: number;
  team?: string | null;
};

export type MatchPlayer = {
  accountId?: string | null;
  name?: string | null;
  team: string;
  slot?: number | null;
  kills?: number | null;
  deaths?: number | null;
  assists?: number | null;
  lastHits?: number | null;
  denies?: number | null;
  netWorth?: number | null;
  gpm?: number | null;
  xpm?: number | null;
};

export type MatchBuilding = {
  name: string;
  health?: number | null;
  maxHealth?: number | null;
};

export type MatchRoshan = {
  alive?: boolean | null;
  phaseTimeRemaining?: number | null;
};

export type MatchDetail = {
  match: LobbyMatch;
  events: MatchEvent[];
  players: MatchPlayer[];
  buildings: MatchBuilding[];
  roshan?: MatchRoshan | null;
};

export async function getMatchDetail(matchId: string): Promise<MatchDetail> {
  return apiFetch<MatchDetail>(`/api/matches/${matchId}`);
}

export function useMatchStream(
  matchId: string,
  initial: MatchDetail | null,
): { detail: MatchDetail | null; connected: boolean } {
  const [detail, setDetail] = useState<MatchDetail | null>(initial);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setDetail(initial);
  }, [initial]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }
    const source = new EventSource(`/api/matches/${matchId}/stream`);

    const handleMatch = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const next = JSON.parse(message.data) as MatchDetail;
        if (next?.match) {
          setDetail(next);
          setConnected(true);
        }
      } catch {
        // Ignore malformed events; the next snapshot recovers.
      }
    };

    source.addEventListener("match", handleMatch);
    source.addEventListener("heartbeat", () => setConnected(true));
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    return () => {
      source.removeEventListener("match", handleMatch);
      source.close();
    };
  }, [matchId]);

  return { detail, connected };
}
