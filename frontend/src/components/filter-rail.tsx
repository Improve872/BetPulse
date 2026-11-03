"use client";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export type TournamentOption = {
  name: string;
  count: number;
};

export function FilterRail({
  tournament,
  onTournamentChange,
  tournaments,
  visibleCount,
  totalCount,
  onClear,
}: {
  tournament: string;
  onTournamentChange: (tournament: string) => void;
  tournaments: TournamentOption[];
  visibleCount: number;
  totalCount: number;
  onClear: () => void;
}) {
  const { t } = useLanguage();

  return (
    <aside className="sticky top-24">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[11px] font-bold uppercase tracking-[0.18em] text-arena-muted">
          {t("filters.tournament")}
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={tournament === "all"}
          className="text-[11px] font-semibold text-accent transition hover:text-accent-bright disabled:cursor-not-allowed disabled:text-arena-muted/40"
        >
          {t("filters.clear")}
        </button>
      </div>

      <div className="mt-3 space-y-0.5">
        <button
          type="button"
          onClick={() => onTournamentChange("all")}
          aria-pressed={tournament === "all"}
          className={cn(
            "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
            tournament === "all"
              ? "bg-white/[0.07] font-semibold text-arena-ink"
              : "text-arena-muted hover:bg-white/[0.04] hover:text-arena-ink",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {t("filters.allTournaments")}
          </span>
          <span className="text-[11px] font-semibold tabular-nums text-arena-muted">
            {totalCount}
          </span>
          {tournament === "all" ? (
            <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
          ) : null}
        </button>

        {tournaments.map((option) => (
          <button
            key={option.name}
            type="button"
            onClick={() => onTournamentChange(option.name)}
            aria-pressed={tournament === option.name}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
              tournament === option.name
                ? "bg-white/[0.07] font-semibold text-arena-ink"
                : "text-arena-muted hover:bg-white/[0.04] hover:text-arena-ink",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{option.name}</span>
            <span className="text-[11px] font-semibold tabular-nums text-arena-muted">
              {option.count}
            </span>
            {tournament === option.name ? (
              <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
            ) : null}
          </button>
        ))}
      </div>

      <p className="mt-5 border-t border-arena-line pt-3 text-[11px] text-arena-muted">
        {t("filters.showing", { count: visibleCount })}
      </p>
    </aside>
  );
}
