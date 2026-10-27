"use client";

import { useEffect, useRef, useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/icons";
import { cn } from "@/lib/format";
import { games } from "@/lib/games";
import { useLanguage } from "@/lib/i18n";
import type { GameId } from "@/lib/lobby";

type GameSwitcherProps = {
  value: GameId;
  onChange: (game: GameId) => void;
  variant?: "dark" | "light";
};

export function GameSwitcher({
  value,
  onChange,
  variant = "dark",
}: GameSwitcherProps) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const current = games.find((game) => game.id === value) ?? games[0];

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((currentOpen) => !currentOpen)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={t("games.label")}
        className={cn(
          "inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm font-medium transition",
          variant === "dark"
            ? "border-white/10 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white"
            : "border-line bg-slate-50 text-ink hover:bg-slate-100",
        )}
      >
        <span className="grid h-6 w-6 place-items-center rounded-md bg-accent/15 text-[9px] font-bold text-accent">
          {current.mark}
        </span>
        <span className="whitespace-nowrap">{current.name}</span>
        <ChevronDownIcon
          className={cn(
            "h-4 w-4 transition",
            open ? "rotate-180" : "rotate-0",
          )}
        />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={t("games.label")}
          className="absolute left-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-line bg-surface p-1.5 text-ink shadow-xl"
        >
          {games.map((game) => (
            <button
              key={game.id}
              type="button"
              role="option"
              aria-selected={game.id === value}
              disabled={!game.available}
              onClick={() => {
                if (!game.available) {
                  return;
                }
                onChange(game.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition",
                game.available
                  ? "text-ink hover:bg-slate-50"
                  : "cursor-not-allowed text-muted/60",
                game.id === value && "bg-slate-50",
              )}
            >
              <span
                className={cn(
                  "grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold",
                  game.available
                    ? "bg-accent/10 text-accent-strong"
                    : "bg-slate-100 text-slate-400",
                )}
              >
                {game.mark}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{game.name}</span>
                <span className="block text-[11px] text-muted">
                  {game.available ? t("games.live") : t("games.soon")}
                </span>
              </span>
              {game.id === value ? (
                <CheckIcon className="h-4 w-4 shrink-0 text-accent" />
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
