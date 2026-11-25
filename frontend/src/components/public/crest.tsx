"use client";

import { useState } from "react";
import { cn, getInitials } from "@/lib/format";

type CrestSize = "xs" | "sm" | "md" | "lg" | "hero" | "xl";

const sizes: Record<CrestSize, string> = {
  xs: "h-6 w-6 text-[9px]",
  sm: "h-8 w-8 text-[10px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
  hero: "h-16 w-16 text-sm sm:h-20 sm:w-20 sm:text-lg",
  xl: "h-20 w-20 text-lg",
};

export function Crest({
  name,
  url,
  size = "md",
  className,
  rounded = "xl",
  tone = "light",
}: {
  name: string;
  url?: string | null;
  size?: CrestSize;
  className?: string;
  rounded?: "full" | "xl";
  tone?: "light" | "dark";
}) {
  const [failed, setFailed] = useState(false);
  const initials = getInitials(name);
  const showImage = Boolean(url) && !failed;

  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center overflow-hidden border font-headline font-bold",
        tone === "dark"
          ? "border-white/15 bg-white/10 text-white/80"
          : "border-line bg-paper-soft text-muted",
        rounded === "full" ? "rounded-full" : "rounded-xl",
        sizes[size],
        className,
      )}
      title={name}
    >
      <span aria-hidden="true" className={showImage ? "opacity-0" : "opacity-100"}>
        {initials}
      </span>
      {showImage ? (
        // Escudos reales de ESPN o del proxy de OpenDota; CSP permite ambos.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url ?? ""}
          alt=""
          loading={size === "xl" ? "eager" : "lazy"}
          decoding="async"
          fetchPriority={size === "xl" ? "high" : "auto"}
          onError={() => setFailed(true)}
          className="absolute inset-0 h-full w-full object-contain p-1"
        />
      ) : null}
    </span>
  );
}
