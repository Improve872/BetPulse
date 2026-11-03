"use client";

import { useEffect, useRef, useState } from "react";
import { cn, formatOdds } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  selectionLabel,
  type Market,
  type Selection,
} from "@/lib/markets";

type OddsSize = "sm" | "md" | "lg";

export function OddsButton({
  market,
  selection,
  selected = false,
  onSelect,
  size = "md",
  label,
  className,
}: {
  market: Market;
  selection: Selection;
  selected?: boolean;
  onSelect: () => void;
  size?: OddsSize;
  label?: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const previous = useRef(selection.odds);
  const [trend, setTrend] = useState<"up" | "down" | null>(null);
  const disabled = market.status !== "OPEN";

  useEffect(() => {
    if (selection.odds === previous.current) {
      return;
    }
    const nextTrend = selection.odds > previous.current ? "up" : "down";
    previous.current = selection.odds;
    setTrend(nextTrend);
    const timer = window.setTimeout(() => setTrend(null), 700);
    return () => window.clearTimeout(timer);
  }, [selection.odds]);

  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      onClick={onSelect}
      className={cn(
        "group/odds relative flex items-center justify-between gap-2 overflow-hidden rounded-xl border px-3 text-left transition",
        size === "lg" ? "min-h-14 py-2" : size === "sm" ? "min-h-11 py-1.5" : "min-h-12 py-2",
        disabled
          ? "cursor-not-allowed border-arena-line/70 bg-arena-raised/30 text-arena-muted/60"
          : selected
            ? "border-accent bg-accent/15 text-arena-ink"
            : "border-arena-line bg-arena-raised/60 text-arena-ink hover:border-accent/55 hover:bg-arena-raised",
        trend === "up" && !selected && "odds-flash-up",
        trend === "down" && !selected && "odds-flash-down",
        className,
      )}
    >
      <span className="min-w-0">
        <span className="block truncate text-[11px] font-semibold uppercase tracking-[0.08em] text-arena-muted">
          {label ?? selectionLabel(market, selection.key, t)}
        </span>
        <span
          className={cn(
            "mt-0.5 block font-score font-semibold tabular-nums text-arena-ink",
            size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-lg",
          )}
        >
          {formatOdds(selection.odds)}
        </span>
      </span>
      <span
        aria-hidden="true"
        className={cn(
          "shrink-0 text-xs font-semibold",
          trend === "up"
            ? "text-emerald-400"
            : trend === "down"
              ? "text-rose-400"
              : selected
                ? "text-accent"
                : "text-arena-muted/50",
        )}
      >
        {trend === "up" ? "↑" : trend === "down" ? "↓" : selected ? "✓" : "+"}
      </span>
    </button>
  );
}
