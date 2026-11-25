"use client";

import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export type DateRange = "today" | "tomorrow" | "week";

export function RangeTabs({
  value,
  onChange,
}: {
  value: DateRange;
  onChange: (range: DateRange) => void;
}) {
  const { t } = useLanguage();
  const options: { key: DateRange; label: string }[] = [
    { key: "today", label: t("home.filter.today") },
    { key: "tomorrow", label: t("home.filter.tomorrow") },
    { key: "week", label: t("home.filter.week") },
  ];

  return (
    <div className="flex items-center gap-2" role="group">
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          onClick={() => onChange(option.key)}
          aria-pressed={value === option.key}
          className={cn(
            "inline-flex h-9 items-center rounded-lg border px-4 text-[13px] font-semibold transition",
            value === option.key
              ? "border-accent bg-accent text-masthead"
              : "border-line bg-white text-ink hover:border-accent/40",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
