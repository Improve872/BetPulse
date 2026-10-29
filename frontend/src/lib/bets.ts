"use client";

import { apiFetch } from "@/lib/api";
import type { TranslationKey } from "@/lib/i18n";

export type BetStatus =
  | "PLACED"
  | "WON"
  | "LOST"
  | "VOID"
  | "NEEDS_REVIEW";

export type Bet = {
  id: string;
  marketId: string;
  matchId: string;
  marketType: string;
  marketTitle: string;
  line?: number | null;
  selectionKey: string;
  selectionLabel: string;
  marketVersion: number;
  odds: number;
  stakeCents: number;
  potentialPayoutCents: number;
  status: BetStatus;
  replayed: boolean;
  createdAt: string;
};

export type PlaceBetInput = {
  marketId: string;
  selectionKey: string;
  stakeCents: number;
  expectedOdds: number;
  marketVersion: number;
};

export async function placeBet(
  input: PlaceBetInput,
  idempotencyKey: string,
): Promise<Bet> {
  return apiFetch<Bet>("/api/bets", {
    method: "POST",
    headers: { "Idempotency-Key": idempotencyKey },
    body: JSON.stringify(input),
  });
}

export async function getBets(limit = 50): Promise<Bet[]> {
  return apiFetch<Bet[]>(`/api/bets?limit=${limit}`);
}

export function betStatusKey(status: BetStatus): TranslationKey {
  return `bets.status.${status}` as TranslationKey;
}
