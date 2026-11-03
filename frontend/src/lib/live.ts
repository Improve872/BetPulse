"use client";

import { useCallback, useEffect, useState } from "react";
import type { LobbyData } from "@/lib/lobby";
import type { LiveMarketsData } from "@/lib/markets";

export type FeedConnection = "connecting" | "connected" | "disconnected";

export function useLobbyFeed(
  initialData: LobbyData,
  initialMarkets: LiveMarketsData,
) {
  const [data, setData] = useState(initialData);
  const [markets, setMarkets] = useState(initialMarkets);
  const [connection, setConnection] = useState<FeedConnection>("connecting");
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    setMarkets(initialMarkets);
  }, [initialMarkets]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      setConnection("disconnected");
      return;
    }

    const source = new EventSource("/api/live/stream");

    const handleLobby = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const next = JSON.parse(message.data) as LobbyData;
        if (Array.isArray(next.live) && Array.isArray(next.recent)) {
          setData(next);
          setConnection("connected");
        }
      } catch {
        // Ignore malformed events; the next snapshot or heartbeat will recover.
      }
    };

    const handleMarkets = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const next = JSON.parse(message.data) as LiveMarketsData;
        if (Array.isArray(next.markets)) {
          setMarkets(next);
          setConnection("connected");
        }
      } catch {
        // Ignore malformed events; the next snapshot or heartbeat will recover.
      }
    };

    const handleHeartbeat = () => {
      setConnection("connected");
    };

    source.addEventListener("lobby", handleLobby);
    source.addEventListener("markets", handleMarkets);
    source.addEventListener("heartbeat", handleHeartbeat);
    source.onopen = () => setConnection("connected");
    source.onerror = () => setConnection("disconnected");

    return () => {
      source.removeEventListener("lobby", handleLobby);
      source.removeEventListener("markets", handleMarkets);
      source.removeEventListener("heartbeat", handleHeartbeat);
      source.close();
    };
  }, [attempt]);

  const retry = useCallback(() => {
    setConnection("connecting");
    setAttempt((current) => current + 1);
  }, []);

  return { data, markets, connection, retry };
}
