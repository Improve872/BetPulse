"use client";

import { CheckIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyView } from "@/lib/lobby";

type FilterRailProps = {
  view: LobbyView;
  onViewChange: (view: LobbyView) => void;
  tournament: string;
  onTournamentChange: (tournament: string) => void;
  tournaments: string[];
  liveCount: number;
  resultCount: number;
  visibleCount: number;
  onClear: () => void;
};

export function FilterRail({
  view,
  onViewChange,
  tournament,
  onTournamentChange,
  tournaments,
  liveCount,
  resultCount,
  visibleCount,
  onClear,
}: FilterRailProps) {
  const { t } = useLanguage();

  const options: Array<{ id: LobbyView; label: string; count?: number }> = [
    { id: "all", label: t("state.all") },
    { id: "live", label: t("state.live"), count: liveCount },
    { id: "results", label: t("state.results"), count: resultCount },
    { id: "upcoming", label: t("state.upcoming"), count: 0 },
  ];

  return (
    <aside className="rounded-2xl border border-line bg-surface p-4 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-ink">{t("filters.title")}</h2>
        <button
          type="button"
          onClick={onClear}
          disabled={view === "all" && tournament === "all"}
          className="text-[11px] font-semibold text-accent-strong transition hover:text-accent disabled:cursor-not-allowed disabled:text-muted/40"
        >
          {t("filters.clear")}
        </button>
      </div>

      <div className="mt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {t("filters.state")}
        </p>
        <div className="mt-2 space-y-1">
          {options.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => onViewChange(option.id)}
              aria-pressed={view === option.id}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                view === option.id
                  ? "bg-accent/5 font-semibold text-accent-strong"
                  : "text-muted hover:bg-slate-50 hover:text-ink",
              )}
            >
              <span>{option.label}</span>
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[10px] font-semibold",
                  view === option.id
                    ? "bg-accent/10 text-accent-strong"
                    : "bg-slate-100 text-muted",
                )}
              >
                {option.count ?? "·"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-line pt-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
          {t("filters.tournament")}
        </p>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={() => onTournamentChange("all")}
            aria-pressed={tournament === "all"}
            className={cn(
              "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
              tournament === "all"
                ? "bg-slate-50 font-medium text-ink"
                : "text-muted hover:bg-slate-50 hover:text-ink",
            )}
          >
            <span className="min-w-0 flex-1 truncate">
              {t("filters.allTournaments")}
            </span>
            {tournament === "all" ? (
              <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
            ) : null}
          </button>
          {tournaments.map((name) => (
            <button
              key={name}
              type="button"
              onClick={() => onTournamentChange(name)}
              aria-pressed={tournament === name}
              className={cn(
                "flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm transition",
                tournament === name
                  ? "bg-slate-50 font-medium text-ink"
                  : "text-muted hover:bg-slate-50 hover:text-ink",
              )}
            >
              <span className="min-w-0 flex-1 truncate">{name}</span>
              {tournament === name ? (
                <CheckIcon className="h-3.5 w-3.5 shrink-0 text-accent" />
              ) : null}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 border-t border-line pt-3 text-[11px] text-muted">
        {t("filters.showing", { count: visibleCount })}
      </p>
    </aside>
  );
}
