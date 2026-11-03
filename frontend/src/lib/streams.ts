"use client";

import { apiFetch } from "@/lib/api";

export type StreamProvider = "TWITCH" | "YOUTUBE";

export type AdminStream = {
  id: number;
  matchId?: string | null;
  leagueId?: number | null;
  provider: StreamProvider;
  channelOrVideo: string;
  label?: string | null;
  fallbackUrl?: string | null;
  enabled: boolean;
  updatedAt: string;
};

export type StreamInput = {
  matchId?: string | null;
  leagueId?: number | null;
  provider: StreamProvider;
  channelOrVideo: string;
  label?: string | null;
  fallbackUrl?: string | null;
  enabled: boolean;
};

export function getStreams() {
  return apiFetch<AdminStream[]>("/api/admin/streams");
}

export function saveStream(input: StreamInput) {
  return apiFetch<AdminStream>("/api/admin/streams", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function setStreamEnabled(id: number, enabled: boolean) {
  return apiFetch<AdminStream>(`/api/admin/streams/${id}/enabled`, {
    method: "POST",
    body: JSON.stringify({ enabled }),
  });
}

export function deleteStream(id: number) {
  return apiFetch<void>(`/api/admin/streams/${id}`, { method: "DELETE" });
}
