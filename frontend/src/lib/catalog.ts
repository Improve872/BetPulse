import type { LobbyData } from "@/lib/lobby";

const BACKEND_URL = (process.env.BACKEND_URL ?? "http://127.0.0.1:8081").replace(
  /\/$/,
  "",
);

export async function getLobbyData(): Promise<LobbyData> {
  try {
    const response = await fetch(`${BACKEND_URL}/api/catalog/lobby`, {
      headers: { Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(7000),
    });

    if (!response.ok) {
      return unavailableLobby();
    }

    const data = (await response.json()) as LobbyData;
    return {
      live: Array.isArray(data.live) ? data.live : [],
      recent: Array.isArray(data.recent) ? data.recent : [],
      updatedAt: data.updatedAt ?? new Date().toISOString(),
      feed: data.feed,
    };
  } catch {
    return unavailableLobby();
  }
}

function unavailableLobby(): LobbyData {
  return {
    live: [],
    recent: [],
    updatedAt: new Date().toISOString(),
    feed: {
      source: "OPENDOTA",
      status: "DOWN",
      consecutiveFailures: 0,
      stale: true,
      lastError: "Backend no disponible.",
    },
  };
}
