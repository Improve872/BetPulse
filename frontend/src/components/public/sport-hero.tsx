"use client";

import Link from "next/link";
import { Crest } from "@/components/public/crest";
import { kickoffTiming } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import type { PublicSport } from "@/lib/prematch";
import type { Fixture } from "@/lib/sports";

export function SportHero({
  fixture,
  sport,
  onOpen,
}: {
  fixture: Fixture;
  sport: PublicSport;
  onOpen: (fixture: Fixture) => void;
}) {
  const { t, language } = useLanguage();
  const timing = kickoffTiming(fixture.kickoff, language);
  const dayLabel =
    timing.day === "today"
      ? t("home.filter.today")
      : timing.day === "tomorrow"
        ? t("home.filter.tomorrow")
        : timing.weekday;
  const image =
    sport === "nba" ? "/hero/basketball-wide.jpg" : "/hero/football-wide.jpg";
  const sportLabel = sport === "nba" ? t("nav.nba") : t("nav.football");

  return (
    <div className="mt-4">
      <nav
        aria-label="Migas de pan"
        className="flex flex-wrap items-center gap-1.5 px-0.5 text-[12px] text-muted"
      >
        <Link href="/" className="transition hover:text-ink">
          {t("nav.home")}
        </Link>
        <span aria-hidden="true" className="text-line">
          /
        </span>
        <span className="font-semibold text-ink">{sportLabel}</span>
        {fixture.leagueName.toLowerCase() !== sportLabel.toLowerCase() ? (
          <>
            <span aria-hidden="true" className="text-line">
              /
            </span>
            <span className="min-w-0 truncate">{fixture.leagueName}</span>
          </>
        ) : null}
      </nav>

      <div className="relative mt-2 overflow-hidden rounded-xl bg-masthead text-white md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <button
          type="button"
          onClick={() => onOpen(fixture)}
          aria-label={`${t("home.markets")}: ${fixture.home.name} vs ${fixture.away.name}`}
          className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent"
        />

        <div className="relative h-[152px] md:h-auto md:min-h-[200px]">
          {/* Fondo local con licencia; el contenedor respeta el 2:1 del archivo. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={image}
            alt=""
            aria-hidden="true"
            loading="lazy"
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-masthead/70 via-masthead/10 to-transparent md:bg-gradient-to-r md:from-transparent md:via-masthead/10 md:to-masthead/60"
          />
        </div>

        <div className="pointer-events-none relative flex flex-col justify-between gap-4 p-4 sm:p-5 md:min-h-[200px]">
          <div className="flex items-start justify-between gap-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/70">
              {fixture.leagueName}
            </p>
            <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-accent px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-masthead sm:px-3 sm:py-1.5">
              {t("home.markets")} <span aria-hidden="true">→</span>
            </span>
          </div>

          <div className="flex items-center justify-center gap-4 sm:gap-9">
            <TeamBlock name={fixture.home.name} url={fixture.home.crestUrl} />

            <div className="shrink-0 text-center">
              <p className="font-headline text-xl font-bold uppercase leading-none tracking-tight text-white sm:text-2xl">
                VS
              </p>
              <p className="mt-1.5 whitespace-nowrap text-[11px] font-medium text-white/80 sm:text-xs">
                {dayLabel} · {timing.time}
              </p>
            </div>

            <TeamBlock name={fixture.away.name} url={fixture.away.crestUrl} />
          </div>
        </div>
      </div>
    </div>
  );
}

function TeamBlock({ name, url }: { name: string; url?: string | null }) {
  return (
    <div className="flex min-w-0 max-w-[34%] flex-col items-center gap-2 text-center">
      <Crest name={name} url={url} size="lg" rounded="full" />
      <span className="line-clamp-2 text-[13px] font-semibold leading-tight text-white sm:text-[15px]">
        {name}
      </span>
    </div>
  );
}
