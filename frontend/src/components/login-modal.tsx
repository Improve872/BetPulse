"use client";

import { useEffect, useState } from "react";
import {
  CloseIcon,
  EyeIcon,
  EyeOffIcon,
  InfoIcon,
} from "@/components/icons";
import { Logo } from "@/components/logo";
import { Modal } from "@/components/modal";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export type LoginMode = "login" | "register";

type LoginModalProps = {
  open: boolean;
  mode: LoginMode;
  onModeChange: (mode: LoginMode) => void;
  onClose: () => void;
};

export function LoginModal({
  open,
  mode,
  onModeChange,
  onClose,
}: LoginModalProps) {
  const { t } = useLanguage();
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMessage("");
  }, [mode]);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(t("login.pending"));
  };

  const isRegister = mode === "register";

  return (
    <Modal
      open={open}
      onClose={onClose}
      labelledBy="login-title"
      panelClassName="sm:max-w-md"
    >
      <div className="bg-navy px-5 pb-5 pt-4 text-white sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <Logo />
          <button
            type="button"
            onClick={onClose}
            aria-label={t("login.close")}
            className="grid h-9 w-9 place-items-center rounded-lg text-white/60 transition hover:bg-white/10 hover:text-white"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>
        <h2
          id="login-title"
          className="mt-5 font-display text-xl font-semibold tracking-tight"
        >
          {isRegister ? t("login.registerTitle") : t("login.title")}
        </h2>
        <p className="mt-1 text-sm leading-6 text-white/55">
          {isRegister ? t("login.registerSubtitle") : t("login.subtitle")}
        </p>
      </div>

      <div className="px-5 py-5 sm:px-6">
        <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1">
          <button
            type="button"
            onClick={() => onModeChange("login")}
            aria-pressed={mode === "login"}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === "login"
                ? "bg-white text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {t("login.tabLogin")}
          </button>
          <button
            type="button"
            onClick={() => onModeChange("register")}
            aria-pressed={mode === "register"}
            className={cn(
              "rounded-lg px-3 py-2 text-sm font-semibold transition",
              mode === "register"
                ? "bg-white text-ink shadow-sm"
                : "text-muted hover:text-ink",
            )}
          >
            {t("login.tabRegister")}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {isRegister ? (
            <label className="block">
              <span className="text-xs font-semibold text-ink">
                {t("login.name")}
              </span>
              <input
                type="text"
                name="name"
                autoComplete="name"
                required
                className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
                placeholder="Alex"
              />
            </label>
          ) : null}

          <label className="block">
            <span className="text-xs font-semibold text-ink">
              {t("login.email")}
            </span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              required
              data-autofocus
              className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
              placeholder="tu@correo.com"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold text-ink">
              {t("login.password")}
            </span>
            <span className="relative mt-1.5 block">
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete={isRegister ? "new-password" : "current-password"}
                required
                minLength={8}
                className="w-full rounded-lg border border-line bg-white px-3 py-2.5 pr-11 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-accent focus:ring-2 focus:ring-accent/15"
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword((visible) => !visible)}
                aria-label={
                  showPassword
                    ? t("login.hidePassword")
                    : t("login.showPassword")
                }
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted transition hover:text-ink"
              >
                {showPassword ? (
                  <EyeOffIcon className="h-4 w-4" />
                ) : (
                  <EyeIcon className="h-4 w-4" />
                )}
              </button>
            </span>
          </label>

          {isRegister ? (
            <label className="flex items-start gap-2.5 text-[11px] leading-5 text-muted">
              <input
                type="checkbox"
                required
                className="mt-0.5 h-3.5 w-3.5 rounded border-line accent-[var(--color-accent)]"
              />
              <span>{t("login.terms")}</span>
            </label>
          ) : (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setMessage(t("login.recoveryPending"))}
                className="text-[11px] font-semibold text-accent-strong transition hover:text-accent"
              >
                {t("login.forgot")}
              </button>
            </div>
          )}

          <button
            type="submit"
            className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white shadow-[0_10px_22px_-14px_rgba(249,115,22,0.9)] transition hover:bg-accent-strong"
          >
            {isRegister ? t("login.submitRegister") : t("login.submitLogin")}
          </button>
        </form>

        {message ? (
          <p
            aria-live="polite"
            className="mt-3 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3 text-[11px] leading-5 text-accent-strong"
          >
            <InfoIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {message}
          </p>
        ) : null}

        <button
          type="button"
          onClick={onClose}
          className="mt-4 w-full text-center text-[11px] font-medium text-muted transition hover:text-ink"
        >
          {t("login.guest")}
        </button>
      </div>
    </Modal>
  );
}
