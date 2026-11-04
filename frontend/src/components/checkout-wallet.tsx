"use client";

import { useRef } from "react";
import { BrandLogo } from "@/components/brand-logo";
import { Input } from "@/components/checkout-ui";
import { CheckIcon } from "@/components/icons";
import {
  formatPhone,
  isValidPhone,
  onlyDigits,
  type CheckoutErrors,
  type PaymentDetails,
  type PaymentTab,
} from "@/lib/checkout";
import { cn } from "@/lib/format";
import type { TranslationKey } from "@/lib/i18n";

type Translate = (key: TranslationKey) => string;
type WalletMethod = "YAPE" | "PLIN";

export function CheckoutWallet({
  method,
  mode,
  value,
  onChange,
  errors,
  t,
  otpSent,
  resendIn,
  onSendCode,
  onResend,
}: {
  method: WalletMethod;
  mode: PaymentTab;
  value: PaymentDetails;
  onChange: (patch: Partial<PaymentDetails>) => void;
  errors: CheckoutErrors;
  t: Translate;
  otpSent: boolean;
  resendIn: number;
  onSendCode: () => void;
  onResend: () => void;
}) {
  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);
  const phoneOk = isValidPhone(value.phone);
  const label = method === "YAPE" ? "Yape" : "Plin";
  const title =
    mode === "deposit"
      ? t(method === "YAPE" ? "checkout.payWithYape" : "checkout.payWithPlin")
      : t(
          method === "YAPE"
            ? "checkout.receiveWithYape"
            : "checkout.receiveWithPlin",
        );

  const setOtpChar = (index: number, raw: string) => {
    const cleaned = raw.replace(/\D/g, "");
    const chars = Array.from({ length: 6 }, (_, position) => value.otp[position] ?? " ");
    if (cleaned.length > 1) {
      const pasted = cleaned.slice(0, 6);
      onChange({ otp: pasted });
      otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
      return;
    }
    chars[index] = cleaned || " ";
    onChange({ otp: chars.join("").replace(/\s+$/, "") });
    if (cleaned && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-line bg-slate-50 p-3">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-white ring-1 ring-line">
          <BrandLogo
            brand={method === "YAPE" ? "yape" : "plin"}
            className={method === "YAPE" ? "h-6" : "h-7 w-7"}
          />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{title}</p>
          <p className="text-[11px] leading-4 text-muted">
            {mode === "deposit"
              ? t("checkout.walletDepositHint")
              : t("checkout.walletWithdrawHint")}
          </p>
        </div>
      </div>

      <div>
        <label htmlFor="wallet-phone" className="text-xs font-semibold text-ink">
          {t("checkout.phone")}
        </label>
        <div className="relative mt-1.5">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted">
            +51
          </span>
          <Input
            id="wallet-phone"
            value={formatPhone(value.phone)}
            onChange={(event) =>
              onChange({ phone: onlyDigits(event.target.value, 9) })
            }
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t("checkout.phonePlaceholder")}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby={errors.phone ? "wallet-phone-error" : "wallet-phone-hint"}
            className="pl-11"
          />
        </div>
        {errors.phone ? (
          <p id="wallet-phone-error" className="mt-1.5 text-[11px] leading-4 text-red-600">
            {t(errors.phone)}
          </p>
        ) : (
          <p id="wallet-phone-hint" className="mt-1.5 text-[11px] leading-4 text-muted">
            {t("checkout.phoneHint")}
          </p>
        )}
      </div>

      {mode === "deposit" ? (
        otpSent ? (
          <div className="space-y-3 rounded-xl border border-line bg-white p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold text-ink">{t("checkout.otp")}</p>
                <p className="mt-0.5 text-[11px] leading-4 text-muted">
                  {t("checkout.otpHint")}
                </p>
              </div>
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                <CheckIcon className="h-3 w-3" />
                {label}
              </span>
            </div>
            <p aria-live="polite" className="text-[11px] text-muted">
              {t("checkout.otpSent")} +51 {formatPhone(value.phone)}
            </p>
            <div className="flex justify-between gap-1.5" onPaste={(event) => {
              const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
              if (pasted) {
                event.preventDefault();
                onChange({ otp: pasted });
                otpRefs.current[Math.min(pasted.length, 6) - 1]?.focus();
              }
            }}>
              {Array.from({ length: 6 }, (_, index) => (
                <input
                  key={index}
                  ref={(element) => {
                    otpRefs.current[index] = element;
                  }}
                  value={value.otp[index] ?? ""}
                  onChange={(event) => setOtpChar(index, event.target.value)}
                  onKeyDown={(event) => {
                    if (
                      event.key === "Backspace" &&
                      !(value.otp[index] ?? "").trim() &&
                      index > 0
                    ) {
                      event.preventDefault();
                      const chars = Array.from(
                        { length: 6 },
                        (_, position) => value.otp[position] ?? " ",
                      );
                      chars[index - 1] = " ";
                      onChange({ otp: chars.join("").replace(/\s+$/, "") });
                      otpRefs.current[index - 1]?.focus();
                    }
                  }}
                  inputMode="numeric"
                  autoComplete={index === 0 ? "one-time-code" : "off"}
                  maxLength={1}
                  autoFocus={index === 0}
                  aria-label={`${t("checkout.otp")} ${index + 1}`}
                  aria-invalid={Boolean(errors.otp)}
                  className={cn(
                    "h-12 w-full rounded-lg border bg-white text-center font-mono text-lg font-semibold text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15",
                    errors.otp ? "border-red-300" : "border-line",
                  )}
                />
              ))}
            </div>
            {errors.otp ? (
              <p className="text-[11px] leading-4 text-red-600">{t(errors.otp)}</p>
            ) : null}
            <div className="flex items-center justify-between gap-3 border-t border-line pt-2.5">
              <span className="text-[11px] text-muted">
                {resendIn > 0
                  ? `${t("checkout.resendIn")} 0:${String(resendIn).padStart(2, "0")}`
                  : t("checkout.didNotReceive")}
              </span>
              <button
                type="button"
                onClick={onResend}
                disabled={resendIn > 0}
                className="text-[11px] font-semibold text-accent-strong transition hover:underline disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
              >
                {t("checkout.resend")}
              </button>
            </div>
          </div>
        ) : (
          <div>
            <button
              type="button"
              onClick={onSendCode}
              disabled={!phoneOk}
              className="w-full rounded-lg border border-accent/40 bg-accent/5 px-4 py-2.5 text-sm font-semibold text-accent-strong transition hover:bg-accent/10 disabled:cursor-not-allowed disabled:border-line disabled:bg-slate-50 disabled:text-muted"
            >
              {t("checkout.sendCode")}
            </button>
            {errors.otp ? (
              <p className="mt-1.5 text-[11px] leading-4 text-red-600">
                {t(errors.otp)}
              </p>
            ) : null}
          </div>
        )
      ) : null}
    </div>
  );
}
