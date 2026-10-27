"use client";

import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export function LanguageToggle({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const { language, setLanguage, t } = useLanguage();

  return (
    <div
      className={cn(
        "flex items-center rounded-lg p-0.5",
        variant === "dark"
          ? "border border-white/10 bg-white/5"
          : "border border-line bg-slate-50",
      )}
      role="group"
      aria-label={t("lang.label")}
    >
      {(["es", "en"] as const).map((lang) => (
        <button
          key={lang}
          type="button"
          onClick={() => setLanguage(lang)}
          aria-pressed={language === lang}
          className={cn(
            "rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.14em] transition",
            language === lang
              ? variant === "dark"
                ? "bg-white text-navy"
                : "bg-navy text-white"
              : variant === "dark"
                ? "text-white/55 hover:text-white"
                : "text-muted hover:text-ink",
          )}
        >
          {lang === "es" ? t("lang.es") : t("lang.en")}
        </button>
      ))}
    </div>
  );
}
