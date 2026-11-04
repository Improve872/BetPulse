export const WALLET_UPDATED_EVENT = "betpulse:wallet-updated";

export function notifyWalletUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(WALLET_UPDATED_EVENT));
  }
}
