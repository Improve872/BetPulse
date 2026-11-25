import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import type { APIRequestContext } from "@playwright/test";
import { ingestSnapshot, loadSnapshot } from "./helpers/ingest";

const BASE_URL = process.env.E2E_BASE_URL ?? "http://127.0.0.1:3000";

type CsrfResponse = {
  headerName: string;
  token: string;
};

type WalletResponse = {
  availableCents: number;
  heldCents: number;
};

type BetResponse = {
  matchId: string;
  marketTitle: string;
  status: string;
  potentialPayoutCents: number;
};

type MarketsResponse = {
  markets: { matchId: string; marketKey: string; status: string }[];
};

test("depósito, apuesta, liquidación y saldo final", async ({ page, context }) => {
  test.setTimeout(300_000);
  const api = context.request;
  const suffix = `${Date.now()}`;
  const matchId = `9${suffix}`;
  const sessionId = randomUUID();
  const email = `e2e-${suffix}@betpulse.test`;

  const csrf = await readCsrf(api);
  const registered = await api.post(`${BASE_URL}/api/auth/register`, {
    headers: { [csrf.headerName]: csrf.token },
    data: {
      displayName: "E2E User",
      email,
      password: "Secret123",
      acceptsTerms: true,
      isAdult: true,
    },
  });
  expect(registered.status(), await registered.text()).toBe(201);

  // El registro puede rotar la sesión: se pide un token CSRF nuevo.
  const freshCsrf = await readCsrf(api);
  const deposit = await api.post(`${BASE_URL}/api/wallet/deposits`, {
    headers: {
      [freshCsrf.headerName]: freshCsrf.token,
      "Idempotency-Key": randomUUID(),
    },
    data: { amountCents: 10_000 },
  });
  expect(deposit.ok(), await deposit.text()).toBeTruthy();

  // Partida GSI firmada: crea el partido, sus mercados y lo vuelve destacado.
  await ingestSnapshot(api, loadSnapshot("ingest-first-blood"), {
    matchId,
    sessionId,
  });
  // El evento crítico suspende los mercados 3 s. Un segundo snapshot (los
  // eventos se deduplican) dispara la sincronización y los reabre.
  await page.waitForTimeout(4_000);
  await ingestSnapshot(api, loadSnapshot("ingest-first-blood"), {
    matchId,
    sessionId,
  });

  await expect
    .poll(
      async () => {
        const response = await api.get(`${BASE_URL}/api/markets/live`);
        const data = (await response.json()) as MarketsResponse;
        return data.markets.find(
          (market) =>
            market.matchId === matchId && market.marketKey === "MATCH_WINNER",
        )?.status;
      },
      { timeout: 30_000, intervals: [1_000] },
    )
    .toBe("OPEN");

  await page.goto("/");
  // La hidratación de React puede dejar por un instante el árbol SSR y el
  // hidratado a la vez; se espera y se limita a la card del partido GSI.
  await page.waitForTimeout(2_000);
  const featured = page.locator(
    `[data-testid="dota-match"][data-match-id="${matchId}"]`,
  );
  await expect(featured.first()).toBeVisible({ timeout: 30_000 });

  // Mercado principal: ganador del mapa. Radiant es la selección local.
  await featured.first().getByRole("button", { name: /Radiant/i }).first().click();

  const slip = page.locator("#bet-slip");
  await expect(slip).toBeVisible();
  const placeBetButton = slip.getByRole("button", {
    name: /Apostar|Place bet/i,
  });
  await expect(placeBetButton).toBeVisible({ timeout: 20_000 });

  await slip.locator('input[inputmode="decimal"]').fill("10");
  await placeBetButton.click();
  await expect(
    slip.getByText(/Apuesta registrada|Bet placed/i),
  ).toBeVisible({ timeout: 20_000 });

  const walletAfterBet = await readWallet(api);
  expect(walletAfterBet.availableCents).toBe(9_000);
  expect(walletAfterBet.heldCents).toBe(1_000);

  // POST_GAME firmado: cierra la partida con victoria de Radiant.
  await ingestSnapshot(api, loadSnapshot("ingest-post-game"), { matchId, sessionId });

  // Los schedulers de resultado, mercado y settlement corren cada 30 s.
  let settledBet: BetResponse | undefined;
  await expect
    .poll(
      async () => {
        const response = await api.get(`${BASE_URL}/api/bets?limit=50`);
        const bets = (await response.json()) as BetResponse[];
        settledBet = bets.find((bet) => bet.matchId === matchId);
        return settledBet?.status;
      },
      { timeout: 180_000, intervals: [2_000] },
    )
    .toBe("WON");

  expect(settledBet).toBeDefined();
  const walletAfterWin = await readWallet(api);
  expect(walletAfterWin.heldCents).toBe(0);
  expect(walletAfterWin.availableCents).toBe(
    9_000 + (settledBet?.potentialPayoutCents ?? 0),
  );

  await page.goto("/bets");
  await expect(
    page.getByText(settledBet?.marketTitle ?? "Ganador del mapa").first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText(/Ganada|Won/i).first()).toBeVisible();
});

async function readCsrf(api: APIRequestContext): Promise<CsrfResponse> {
  const response = await api.get(`${BASE_URL}/api/auth/csrf`);
  return (await response.json()) as CsrfResponse;
}

async function readWallet(api: APIRequestContext): Promise<WalletResponse> {
  const response = await api.get(`${BASE_URL}/api/wallet`);
  return (await response.json()) as WalletResponse;
}
