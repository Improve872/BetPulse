"use client";

import { useEffect, useState } from "react";
import type { LobbyData } from "@/lib/lobby";
import type { LiveMarketsData } from "@/lib/markets";

export function useLobbyFeed(
  initialData: LobbyData,
  initialMarkets: LiveMarketsData,
) {
  const [data, setData] = useState(initialData);
  const [markets, setMarkets] = useState(initialMarkets);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  useEffect(() => {
    setMarkets(initialMarkets);
  }, [initialMarkets]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const source = new EventSource("/api/live/stream");

    const handleLobby = (event: Event) => {
      const message = event as MessageEvent<string>;
      try {
        const next = JSON.parse(message.data) as LobbyData;
        if (Array.isArray(next.live) && Array.isArray(next.recent)) {
          setData(next);
          setConnected(true);
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
          setConnected(true);
        }
      } catch {
        // Ignore malformed events; the next snapshot or heartbeat will recover.
      }
    };

    const handleHeartbeat = () => {
      setConnected(true);
    };

    source.addEventListener("lobby", handleLobby);
    source.addEventListener("markets", handleMarkets);
    source.addEventListener("heartbeat", handleHeartbeat);
    source.onopen = () => setConnected(true);
    source.onerror = () => setConnected(false);

    return () => {
      source.removeEventListener("lobby", handleLobby);
      source.removeEventListener("markets", handleMarkets);
      source.removeEventListener("heartbeat", handleHeartbeat);
      source.close();
    };
  }, []);

  return { data, markets, connected };
}
