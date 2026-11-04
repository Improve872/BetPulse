"use client";

import { useState } from "react";
import { EyeIcon, EyeOffIcon } from "@/components/icons";
import { AcceptedBrands, BrandLogo } from "@/components/brand-logo";
import { Input } from "@/components/checkout-ui";
import {
  detectCardBrand,
  formatCardNumber,
  formatExpiry,
  isValidCardNumber,
  onlyDigits,
  type CheckoutErrors,
  type PaymentDetails,
  type PaymentTab,
} from "@/lib/checkout";
import { cn } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

type Translate = (key: TranslationKey) => string;

export function CheckoutCard({
  mode,
  value,
  onChange,
  errors,
  t,
}: {
  mode: PaymentTab;
  value: PaymentDetails;
  onChange: (patch: Partial<PaymentDetails>) => void;
  errors: CheckoutErrors;
  t: Translate;
}) {
  const [showCvv, setShowCvv] = useState(false);
  const brand = detectCardBrand(value.cardNumber);
  const number = formatCardNumber(value.cardNumber);
  const expiry = formatExpiry(value.cardExpiry);
  const holder = value.cardHolder.trim();

  return (
    <div className="space-y-4">
      <div
        aria-hidden="true"
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-[linear-gradient(135deg,#0b1220_0%,#142136_58%,#1e2d49_100%)] p-4 text-white shadow-[0_18px_40px_-24px_rgba(7,13,24,0.7)]"
      >
        <div className="pointer-events-none absolute -right-12 -top-14 h-36 w-36 rounded-full bg-accent/20 blur-2xl" />
        <div className="relative flex items-start justify-between gap-3">
          <span className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/45">
            BetPulse
          </span>
          <BrandLogo
            brand={brand}
            mono={brand === "visa"}
            className={cn(brand === "generic" && "h-5 w-5 text-white/70")}
          />
        </div>
        <div className="relative mt-5 flex items-center gap-3">
          <span className="grid h-7 w-10 place-items-center rounded-md bg-gradient-to-br from-amber-100 via-amber-300 to-amber-500">
            <span className="grid grid-cols-2 gap-0.5">
              {[0, 1, 2, 3].map((item) => (
                <span key={item} className="h-1.5 w-2 rounded-[1px] bg-amber-700/40" />
              ))}
            </span>
          </span>
          <svg
            viewBox="0 0 24 24"
            aria-hidden="true"
            className="h-4 w-4 text-white/45"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.6}
            strokeLinecap="round"
          >
            <path d="M8 8.5a5 5 0 0 1 0 7M11.5 6a9.5 9.5 0 0 1 0 12M5 10.5a2 2 0 0 1 0 3" />
          </svg>
        </div>
        <p
          className={cn(
            "relative mt-4 font-mono text-lg tracking-[0.12em] tabular-nums",
            number ? "text-white" : "text-white/30",
          )}
        >
          {number || "•••• •••• •••• ••••"}
        </p>
        <div className="relative mt-4 flex items-end justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {t("checkout.holderShort")}
            </p>
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-white/85">
              {holder || "NOMBRE APELLIDO"}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-[9px] font-semibold uppercase tracking-[0.16em] text-white/35">
              {t("checkout.expiryShort")}
            </p>
            <p className="font-mono text-[11px] font-semibold text-white/85">
              {mode === "deposit" ? expiry || "MM/AA" : "—"}
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="card-number" className="text-xs font-semibold text-ink">
          {t("checkout.cardNumber")}
        </label>
        <div className="relative mt-1.5">
          <Input
            id="card-number"
            value={number}
            onChange={(event) => {
              const digits = onlyDigits(event.target.value, 19);
              onChange({
                cardNumber:
                  detectCardBrand(digits) === "amex" ? digits.slice(0, 15) : digits,
              });
            }}
            inputMode="numeric"
            autoComplete="cc-number"
            placeholder={t("checkout.cardNumberPlaceholder")}
            aria-invalid={Boolean(errors.cardNumber)}
            aria-describedby={errors.cardNumber ? "card-number-error" : undefined}
            className="pr-14"
          />
          <span className="pointer-events-none absolute right-3 top-1/2 flex -translate-y-1/2 items-center">
            {isValidCardNumber(value.cardNumber) ? (
              <BrandLogo brand={brand} className="h-4 w-auto" />
            ) : (
              <BrandLogo brand="generic" className="h-4 w-4 text-muted" />
            )}
          </span>
        </div>
        <FieldError id="card-number-error" message={errors.cardNumber ? t(errors.cardNumber) : null} />
      </div>

      <div className={cn("grid gap-3", mode === "deposit" && "grid-cols-2")}>
        {mode === "deposit" ? (
          <>
            <div>
              <label htmlFor="card-expiry" className="text-xs font-semibold text-ink">
                {t("checkout.cardExpiry")}
              </label>
              <Input
                id="card-expiry"
                value={expiry}
                onChange={(event) =>
                  onChange({ cardExpiry: onlyDigits(event.target.value, 4) })
                }
                inputMode="numeric"
                autoComplete="cc-exp"
                placeholder={t("checkout.cardExpiryPlaceholder")}
                aria-invalid={Boolean(errors.cardExpiry)}
                aria-describedby={errors.cardExpiry ? "card-expiry-error" : undefined}
                className="mt-1.5"
              />
              <FieldError
                id="card-expiry-error"
                message={errors.cardExpiry ? t(errors.cardExpiry) : null}
              />
            </div>
            <div>
              <label htmlFor="card-cvv" className="text-xs font-semibold text-ink">
                {t("checkout.cardCvv")}
              </label>
              <div className="relative mt-1.5">
                <Input
                  id="card-cvv"
                  type={showCvv ? "text" : "password"}
                  value={value.cardCvv}
                  onChange={(event) =>
                    onChange({ cardCvv: onlyDigits(event.target.value, 4) })
                  }
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder={t("checkout.cardCvvPlaceholder")}
                  aria-invalid={Boolean(errors.cardCvv)}
                  aria-describedby={errors.cardCvv ? "card-cvv-error" : undefined}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCvv((current) => !current)}
                  aria-label={t("checkout.cardCvv")}
                  className="absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-muted transition hover:bg-slate-100 hover:text-ink"
                >
                  {showCvv ? (
                    <EyeOffIcon className="h-4 w-4" />
                  ) : (
                    <EyeIcon className="h-4 w-4" />
                  )}
                </button>
              </div>
              <FieldError
                id="card-cvv-error"
                message={errors.cardCvv ? t(errors.cardCvv) : null}
              />
            </div>
          </>
        ) : null}
      </div>

      <div>
        <label htmlFor="card-holder" className="text-xs font-semibold text-ink">
          {t("checkout.cardHolder")}
        </label>
        <Input
          id="card-holder"
          value={value.cardHolder}
          onChange={(event) =>
            onChange({ cardHolder: event.target.value.slice(0, 40) })
          }
          autoComplete="cc-name"
          placeholder={t("checkout.cardHolderPlaceholder")}
          aria-invalid={Boolean(errors.cardHolder)}
          aria-describedby={errors.cardHolder ? "card-holder-error" : undefined}
          className="mt-1.5"
        />
        <FieldError
          id="card-holder-error"
          message={errors.cardHolder ? t(errors.cardHolder) : null}
        />
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-line pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
          {t("checkout.accepted")}
        </span>
        <AcceptedBrands />
      </div>
    </div>
  );
}

function FieldError({ id, message }: { id: string; message: string | null }) {
  if (!message) {
    return null;
  }
  return (
    <p id={id} className="mt-1.5 text-[11px] leading-4 text-red-600">
      {message}
    </p>
  );
}
