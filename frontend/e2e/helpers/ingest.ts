import { createHmac, randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { APIRequestContext } from "@playwright/test";

const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:8081";
const INGEST_SECRET = process.env.E2E_INGEST_SECRET ?? "betpulse-dev-ingest-secret";

export type GsiSnapshot = Record<string, unknown>;

/**
 * Carga un payload GSI real normalizado por el colector
 * (`backend/src/test/resources/gsi/ingest-*.json`).
 */
export function loadSnapshot(name: string): GsiSnapshot {
  const file = path.resolve(
    process.cwd(),
    "..",
    "backend",
    "src",
    "test",
    "resources",
    "gsi",
    `${name}.json`,
  );
  return JSON.parse(readFileSync(file, "utf8")) as GsiSnapshot;
}

/**
 * Envía un snapshot firmado a `/internal/ingest` con la misma firma que el
 * colector: `hex(HMAC-SHA256(secret, timestamp + "." + body))`.
 */
export async function ingestSnapshot(
  request: APIRequestContext,
  snapshot: GsiSnapshot,
  overrides: { matchId: string; sessionId: string },
): Promise<void> {
  const body = JSON.stringify({
    ...snapshot,
    matchId: overrides.matchId,
    sessionId: overrides.sessionId,
    snapshotId: randomUUID(),
    capturedAt: new Date().toISOString(),
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = createHmac("sha256", INGEST_SECRET)
    .update(`${timestamp}.${body}`)
    .digest("hex");

  const response = await request.post(`${BACKEND_URL}/internal/ingest`, {
    headers: {
      "Content-Type": "application/json",
      "X-BetPulse-Timestamp": timestamp,
      "X-BetPulse-Signature": signature,
    },
    data: body,
  });
  if (!response.ok()) {
    throw new Error(`Ingest falló con ${response.status()}: ${await response.text()}`);
  }
}
