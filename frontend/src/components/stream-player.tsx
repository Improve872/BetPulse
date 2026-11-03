"use client";

import { useEffect, useState } from "react";
import { PlayIcon } from "@/components/icons";
import { PulseMark } from "@/components/pulse-mark";
import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { LobbyStream } from "@/lib/lobby";

export function StreamPlayer({
  stream,
  matchLabel,
  className,
}: {
  stream: LobbyStream;
  matchLabel: string;
  className?: string;
}) {
  const { t } = useLanguage();
  const [started, setStarted] = useState(false);
  const [parent, setParent] = useState("localhost");

  useEffect(() => {
    setParent(window.location.hostname || "localhost");
  }, []);

  const provider = stream.provider === "TWITCH" ? "Twitch" : "YouTube";
  const label = stream.label?.trim() || t("stream.title");
  const src =
    stream.provider === "TWITCH"
      ? `https://player.twitch.tv/?channel=${encodeURIComponent(
          stream.channelOrVideo,
        )}&parent=${encodeURIComponent(parent)}&autoplay=false`
      : `https://www.youtube.com/embed/${encodeURIComponent(
          stream.channelOrVideo,
        )}?autoplay=0&rel=0`;

  return (
    <div
      id="stream"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-arena-line bg-arena-surface shadow-arena",
        className,
      )}
    >
      {started ? (
        <>
          <div className="aspect-video w-full bg-black">
            <iframe
              src={src}
              title={`${label} · ${matchLabel}`}
              className="h-full w-full"
              allow="autoplay; fullscreen; picture-in-picture"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-arena-line px-3 py-2">
            <span className="text-[11px] font-medium text-arena-muted">
              {provider} · {label}
            </span>
            {stream.fallbackUrl ? (
              <a
                href={stream.fallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                {t("stream.fallback", { provider })}
              </a>
            ) : null}
          </div>
        </>
      ) : (
        <div className="relative aspect-video w-full overflow-hidden bg-arena-soft">
          <div className="arena-grid absolute inset-0 opacity-60" />
          <div className="arena-glow absolute inset-0 opacity-70" />
          <PulseMark className="absolute -right-8 top-1/2 h-64 w-64 -translate-y-1/2 text-white/[0.04]" />
          <div className="relative flex h-full flex-col items-center justify-center gap-3 p-6 text-center">
            <span className="rounded-full border border-accent/30 bg-accent/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-accent">
              {provider}
            </span>
            <div>
              <p className="font-display text-lg font-semibold tracking-tight text-arena-ink">
                {label}
              </p>
              <p className="mt-1 text-xs text-arena-muted">{matchLabel}</p>
            </div>
            <button
              type="button"
              onClick={() => setStarted(true)}
              className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright"
            >
              <PlayIcon className="h-4 w-4" />
              {t("stream.play")}
            </button>
            <p className="max-w-sm text-[11px] leading-4 text-arena-muted">
              {t("stream.privacy")}
            </p>
            {stream.fallbackUrl ? (
              <a
                href={stream.fallbackUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] font-semibold text-accent underline-offset-2 hover:underline"
              >
                {t("stream.fallback", { provider })}
              </a>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
