"use client";

import { useState } from "react";
import { Input } from "@/components/checkout-ui";
import { CheckIcon, CopyIcon } from "@/components/icons";
import {
  bankDestinations,
  banks,
  formatCci,
  formatOperation,
  onlyDigits,
  type CheckoutErrors,
  type PaymentDetails,
  type PaymentTab,
} from "@/lib/checkout";
import { cn } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

type Translate = (key: TranslationKey) => string;

export function CheckoutTransfer({
  mode,
  value,
  onChange,
  errors,
  t,
  reference,
}: {
  mode: PaymentTab;
  value: PaymentDetails;
  onChange: (patch: Partial<PaymentDetails>) => void;
  errors: CheckoutErrors;
  t: Translate;
  reference: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);
  const destination = bankDestinations[value.bank];

  const copy = async (key: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1500);
    } catch {
      setCopied(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-semibold text-ink">{t("checkout.bank")}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          {banks.map((bank) => (
            <button
              key={bank.id}
              type="button"
              onClick={() => onChange({ bank: bank.id })}
              aria-pressed={value.bank === bank.id}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-xs font-semibold transition",
                value.bank === bank.id
                  ? "border-accent/50 bg-accent/5 text-ink"
                  : "border-line bg-white text-ink hover:border-slate-300",
              )}
            >
              <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full", bank.tone)} />
              <span className="min-w-0 flex-1 truncate">{bank.name}</span>
              {value.bank === bank.id ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent-strong" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      {mode === "deposit" ? (
        <>
          <div className="rounded-xl border border-line bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              {t("checkout.destination")}
            </p>
            <div className="mt-2 space-y-2">
              <DestinationRow
                label={t("checkout.account")}
                value={destination.account}
                copied={copied === "account"}
                copyLabel={copied === "account" ? t("checkout.copied") : t("checkout.copy")}
                onCopy={() => void copy("account", destination.account)}
              />
              <DestinationRow
                label={t("checkout.cci")}
                value={destination.cci}
                copied={copied === "cci"}
                copyLabel={copied === "cci" ? t("checkout.copied") : t("checkout.copy")}
                onCopy={() => void copy("cci", destination.cci)}
              />
              <DestinationRow
                label={t("checkout.holder")}
                value={destination.holder}
              />
              <DestinationRow
                label={t("checkout.reference")}
                value={reference}
                copied={copied === "reference"}
                copyLabel={
                  copied === "reference" ? t("checkout.copied") : t("checkout.copy")
                }
                onCopy={() => void copy("reference", reference)}
              />
            </div>
          </div>

          <div>
            <label htmlFor="transfer-operation" className="text-xs font-semibold text-ink">
              {t("checkout.operation")}
            </label>
            <Input
              id="transfer-operation"
              value={formatOperation(value.operation)}
              onChange={(event) =>
                onChange({ operation: formatOperation(event.target.value) })
              }
              autoComplete="off"
              placeholder={t("checkout.operationPlaceholder")}
              aria-invalid={Boolean(errors.operation)}
              aria-describedby={
                errors.operation ? "transfer-operation-error" : "transfer-operation-hint"
              }
              className="mt-1.5 font-mono uppercase tracking-wide"
            />
            {errors.operation ? (
              <p
                id="transfer-operation-error"
                className="mt-1.5 text-[11px] leading-4 text-red-600"
              >
                {t(errors.operation)}
              </p>
            ) : (
              <p
                id="transfer-operation-hint"
                className="mt-1.5 text-[11px] leading-4 text-muted"
              >
                {t("checkout.operationHint")}
              </p>
            )}
          </div>

          <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-4 text-muted">
            {t("checkout.transferHint")}
          </p>
        </>
      ) : (
        <>
          <div>
            <label htmlFor="transfer-cci" className="text-xs font-semibold text-ink">
              {t("checkout.cci")}
            </label>
            <Input
              id="transfer-cci"
              value={formatCci(value.cci)}
              onChange={(event) =>
                onChange({ cci: onlyDigits(event.target.value, 20) })
              }
              inputMode="numeric"
              autoComplete="off"
              placeholder="0000 0000 0000 0000 0000"
              aria-invalid={Boolean(errors.cci)}
              aria-describedby={errors.cci ? "transfer-cci-error" : "transfer-cci-hint"}
              className="mt-1.5 font-mono tracking-wide"
            />
            {errors.cci ? (
              <p id="transfer-cci-error" className="mt-1.5 text-[11px] leading-4 text-red-600">
                {t(errors.cci)}
              </p>
            ) : (
              <p id="transfer-cci-hint" className="mt-1.5 text-[11px] leading-4 text-muted">
                {t("checkout.cciHint")}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="transfer-holder" className="text-xs font-semibold text-ink">
              {t("checkout.holder")}
            </label>
            <Input
              id="transfer-holder"
              value={value.cardHolder}
              onChange={(event) =>
                onChange({ cardHolder: event.target.value.slice(0, 40) })
              }
              autoComplete="name"
              placeholder={t("checkout.cardHolderPlaceholder")}
              aria-invalid={Boolean(errors.cardHolder)}
              aria-describedby={
                errors.cardHolder ? "transfer-holder-error" : undefined
              }
              className="mt-1.5"
            />
            {errors.cardHolder ? (
              <p id="transfer-holder-error" className="mt-1.5 text-[11px] leading-4 text-red-600">
                {t(errors.cardHolder)}
              </p>
            ) : null}
          </div>
          <p className="rounded-lg bg-slate-50 p-3 text-[11px] leading-4 text-muted">
            {t("checkout.withdrawTransferHint")}
          </p>
        </>
      )}
    </div>
  );
}

function DestinationRow({
  label,
  value,
  copied,
  copyLabel,
  onCopy,
}: {
  label: string;
  value: string;
  copied?: boolean;
  copyLabel?: string;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="shrink-0 text-muted">{label}</span>
      <div className="flex min-w-0 items-center gap-1.5">
        <span className="truncate font-mono text-[11px] font-semibold text-ink">
          {value}
        </span>
        {onCopy ? (
          <button
            type="button"
            onClick={onCopy}
            className={cn(
              "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-1 text-[10px] font-semibold transition",
              copied
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-line bg-white text-muted hover:text-ink",
            )}
          >
            {copied ? (
              <CheckIcon className="h-3 w-3" />
            ) : (
              <CopyIcon className="h-3 w-3" />
            )}
            {copyLabel}
          </button>
        ) : null}
      </div>
    </div>
  );
}
