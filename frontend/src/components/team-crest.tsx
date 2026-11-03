/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { cn, getInitials } from "@/lib/format";
import type { LobbyTeam } from "@/lib/lobby";

type CrestSize = "xs" | "sm" | "md" | "lg" | "xl";

const sizes: Record<CrestSize, string> = {
  xs: "h-6 w-6 rounded-md p-0.5 text-[9px]",
  sm: "h-8 w-8 rounded-lg p-1 text-[10px]",
  md: "h-10 w-10 rounded-xl p-1 text-xs",
  lg: "h-14 w-14 rounded-2xl p-1.5 text-lg",
  xl: "h-20 w-20 rounded-2xl p-2 text-2xl",
};

export function TeamCrest({
  team,
  size = "md",
  className,
  priority = false,
}: {
  team: LobbyTeam;
  size?: CrestSize;
  className?: string;
  priority?: boolean;
}) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const src =
    !failed && team.teamId
      ? `/api/catalog/teams/${team.teamId}/logo`
      : null;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border border-white/15 bg-arena-raised text-arena-ink",
        team.side === "radiant" ? "ring-1 ring-radiant/30" : "ring-1 ring-dire/30",
        sizes[size],
        className,
      )}
      title={team.name}
    >
      <span
        aria-hidden="true"
        className={cn(
          "font-display font-bold tracking-tight",
          loaded && src ? "opacity-0" : "opacity-100",
        )}
      >
        {getInitials(team.name)}
      </span>
      {src ? (
        <img
          src={src}
          alt=""
          width={80}
          height={80}
          loading={priority ? "eager" : "lazy"}
          fetchPriority={priority ? "high" : "auto"}
          decoding="async"
          className={cn(
            "absolute inset-0 h-full w-full object-contain drop-shadow-[0_0_2px_rgba(248,250,252,0.35)] transition-opacity duration-200",
            loaded ? "opacity-100" : "opacity-0",
          )}
          onLoad={() => setLoaded(true)}
          onError={() => {
            setFailed(true);
            setLoaded(false);
          }}
        />
      ) : null}
    </span>
  );
}
