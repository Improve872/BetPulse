"use client";

import { apiFetch } from "@/lib/api";

export type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  status: string;
  availableCents: number;
  heldCents: number;
  roles: string;
};

export type AdminWalletOperation = {
  transactionId: string;
  availableCents: number;
  heldCents: number;
  currency: string;
  replayed: boolean;
  createdAt: string;
};

export function searchAdminUsers(query: string) {
  const params = query.trim() ? `?query=${encodeURIComponent(query.trim())}` : "";
  return apiFetch<AdminUser[]>(`/api/admin/users${params}`);
}

export function adjustAdminWallet(
  userId: string,
  amountCents: number,
  reason: string,
) {
  return apiFetch<AdminWalletOperation>(
    `/api/admin/users/${userId}/wallet-adjustments`,
    {
      method: "POST",
      headers: { "Idempotency-Key": crypto.randomUUID() },
      body: JSON.stringify({ amountCents, reason }),
    },
  );
}
