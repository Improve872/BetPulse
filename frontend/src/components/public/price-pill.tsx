"use client";

import { cn, formatOdds } from "@/lib/format";

export function PricePill({
  label,
  odds,
  selected,
  disabled,
  ariaLabel,
  onClick,
}: {
  label: string;
  odds: number;
  selected?: boolean;
  disabled?: boolean;
  ariaLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-h-11 items-center justify-between gap-2 rounded-xl border px-2.5 py-1.5 text-left transition",
        disabled
          ? "cursor-not-allowed border-line bg-paper-soft/60 text-subtle"
          : selected
            ? "border-accent bg-accent/10 text-ink ring-1 ring-accent/35"
            : "border-line bg-paper-soft text-ink hover:border-accent/45 hover:bg-white",
      )}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted">
        {label}
      </span>
      <span className="font-score text-[15px] font-semibold tabular-nums">
        {selected ? "✓ " : ""}
        {formatOdds(odds)}
      </span>
    </button>
  );
}
