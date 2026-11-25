"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRightIcon,
  BasketballIcon,
  CloseIcon,
  FootballIcon,
  GamepadIcon,
  SearchIcon,
  TicketIcon,
} from "@/components/icons";
import { LoginModal, type LoginMode } from "@/components/login-modal";
import { Modal } from "@/components/modal";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { betStatusKey, getBets, type Bet } from "@/lib/bets";
import {
  cn,
  formatDateTime,
  formatMoney,
  formatOdds,
  normalizeText,
} from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  betSelectionLabel,
  marketTitleForType,
} from "@/lib/markets";

type Tab = "open" | "settled";
type SportFilter = "all" | "football" | "nba" | "esports";

const OPEN_STATUSES = new Set(["PLACED", "NEEDS_REVIEW"]);

const statusClasses: Record<string, string> = {
  PLACED: "bg-accent/10 text-accent-strong ring-accent/30",
  NEEDS_REVIEW: "bg-amber-50 text-amber-700 ring-amber-200",
  WON: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  LOST: "bg-red-50 text-red-700 ring-red-200",
  VOID: "bg-slate-50 text-slate-500 ring-line",
};

function sportOf(marketType: string): SportFilter {
  if (marketType === "MATCH_RESULT_1X2" || marketType === "TOTAL_GOALS") {
    return "football";
  }
  if (marketType === "MATCH_RESULT_2WAY" || marketType === "TOTAL_POINTS") {
    return "nba";
  }
  return "esports";
}

export function BetsPage() {
  const { t } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [error, setError] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>("login");
  const [tab, setTab] = useState<Tab>("open");
  const [sport, setSport] = useState<SportFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isWide, setIsWide] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(min-width: 1280px)");
    const update = () => setIsWide(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const load = useCallback(async () => {
    setDataLoading(true);
    setError("");
    try {
      const loaded = await getBets(50);
      setBets(loaded);
      if (!loaded.some((bet) => OPEN_STATUSES.has(bet.status))) {
        setTab("settled");
      }
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 401) {
        setError(t("bets.loginRequired"));
      } else {
        setError(t("bets.error"));
      }
    } finally {
      setDataLoading(false);
    }
  }, [t]);

  useEffect(() => {
    if (user) {
      void load();
    } else {
      setBets([]);
    }
  }, [user, load]);

  const openLogin = (mode: LoginMode) => {
    setLoginMode(mode);
    setLoginOpen(true);
  };

  const openBets = useMemo(
    () => bets.filter((bet) => OPEN_STATUSES.has(bet.status)),
    [bets],
  );
  const settledBets = useMemo(
    () => bets.filter((bet) => !OPEN_STATUSES.has(bet.status)),
    [bets],
  );

  const needle = normalizeText(query);

  const visible = useMemo(() => {
    const base = tab === "open" ? openBets : settledBets;
    return base
      .filter((bet) => sport === "all" || sportOf(bet.marketType) === sport)
      .filter((bet) => {
        if (needle.length === 0) {
          return true;
        }
        return (
          normalizeText(bet.marketTitle).includes(needle) ||
          normalizeText(bet.selectionLabel).includes(needle) ||
          normalizeText(bet.id).includes(needle)
        );
      })
      .slice()
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [needle, openBets, settledBets, sport, tab]);

  const selectedBet = bets.find((bet) => bet.id === selectedId) ?? null;

  const emptyCopy =
    query.trim().length > 0
      ? t("bets.searchEmpty")
      : tab === "open"
        ? t("bets.emptyOpen")
        : t("bets.emptySettled");

  return (
    <div className="min-h-screen bg-paper text-ink">
      <SiteHeader
        game="dota2"
        activeView="all"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => openLogin("login")}
        onRegister={() => openLogin("register")}
      />

      <main className="mx-auto max-w-[1240px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-accent-strong">
              {t("bets.subtitle")}
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink sm:text-[28px]">
              {t("bets.title")}
              {user && bets.length > 0 ? (
                <span className="ml-2 font-score text-xl text-muted">
                  ({bets.length})
                </span>
              ) : null}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              href="/wallet"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
            >
              {t("header.wallet")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted transition hover:text-ink"
            >
              {t("bets.back")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {loading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : !user ? (
          <section className="mt-8 rounded-2xl border border-line bg-surface px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent-strong">
              <TicketIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              {t("bets.loginRequired")}
            </h2>
            <button
              type="button"
              onClick={() => openLogin("login")}
              className="mt-6 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright"
            >
              {t("bets.loginAction")}
            </button>
          </section>
        ) : dataLoading ? (
          <div className="mt-6 space-y-3">
            {[0, 1, 2].map((item) => (
              <div
                key={item}
                className="h-20 animate-pulse rounded-xl border border-line bg-surface"
              />
            ))}
          </div>
        ) : error ? (
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
          </p>
        ) : bets.length === 0 ? (
          <section className="mt-8 rounded-2xl border border-dashed border-line bg-surface px-6 py-14 text-center shadow-card">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-50 text-slate-400 ring-1 ring-line">
              <TicketIcon className="h-7 w-7" />
            </span>
            <h2 className="mt-4 text-lg font-semibold text-ink">
              {t("bets.empty")}
            </h2>
            <Link
              href="/"
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright"
            >
              {t("bets.back")}
              <ArrowRightIcon className="h-4 w-4" />
            </Link>
          </section>
        ) : (
          <>
            <div className="mt-6 flex items-center gap-6 border-b border-line">
              <TabButton
                active={tab === "open"}
                label={t("bets.tabOpen")}
                count={openBets.length}
                onClick={() => {
                  setTab("open");
                  setSelectedId(null);
                }}
              />
              <TabButton
                active={tab === "settled"}
                label={t("bets.tabSettled")}
                count={settledBets.length}
                onClick={() => {
                  setTab("settled");
                  setSelectedId(null);
                }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <SportChip
                  active={sport === "all"}
                  label={t("bets.allSports")}
                  onClick={() => setSport("all")}
                />
                <SportChip
                  active={sport === "football"}
                  label={t("nav.football")}
                  icon={<FootballIcon className="h-4 w-4" />}
                  onClick={() => setSport("football")}
                />
                <SportChip
                  active={sport === "nba"}
                  label={t("nav.nba")}
                  icon={<BasketballIcon className="h-4 w-4" />}
                  onClick={() => setSport("nba")}
                />
                <SportChip
                  active={sport === "esports"}
                  label={t("nav.esports")}
                  icon={<GamepadIcon className="h-4 w-4" />}
                  onClick={() => setSport("esports")}
                />
              </div>
              <div className="relative w-full sm:w-[260px]">
                <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={t("bets.search")}
                  aria-label={t("bets.search")}
                  className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-sm text-ink outline-none transition placeholder:text-subtle focus:border-accent focus:ring-2 focus:ring-accent/20"
                />
              </div>
            </div>

            <div className="mt-4 grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
              <div className="min-w-0">
                {visible.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-line bg-white px-6 py-12 text-center">
                    <p className="text-sm font-semibold text-ink">
                      {emptyCopy}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="hidden gap-3 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-subtle md:grid md:grid-cols-[minmax(0,1fr)_4rem_5rem_6rem_6rem]">
                      <span>{t("bets.columnBet")}</span>
                      <span className="text-right">{t("bets.odds")}</span>
                      <span className="text-right">{t("bets.stake")}</span>
                      <span className="text-right">
                        {t("bets.return")}
                      </span>
                      <span className="text-right">
                        {t("bets.columnStatus")}
                      </span>
                    </div>
                    <ul className="overflow-hidden rounded-xl border border-line bg-white">
                      {visible.map((bet) => (
                        <li
                          key={bet.id}
                          className="border-b border-line last:border-0"
                        >
                          <BetRow
                            bet={bet}
                            active={selectedId === bet.id}
                            onSelect={() => setSelectedId(bet.id)}
                          />
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </div>

              <aside className="hidden xl:block">
                <div className="sticky top-[88px]">
                  {selectedBet ? (
                    <BetDetail
                      bet={selectedBet}
                      onClose={() => setSelectedId(null)}
                    />
                  ) : (
                    <div className="rounded-xl border border-dashed border-line bg-white p-6 text-center">
                      <TicketIcon className="mx-auto h-9 w-9 text-line" />
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {t("bets.detail")}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-muted">
                        {t("bets.detailEmpty")}
                      </p>
                    </div>
                  )}
                </div>
              </aside>
            </div>
          </>
        )}
      </main>

      <SiteFooter />

      {selectedBet && !isWide ? (
        <Modal
          open
          onClose={() => setSelectedId(null)}
          labelledBy="bet-detail-title"
          panelClassName="max-w-md"
        >
          <h2 id="bet-detail-title" className="sr-only">
            {t("bets.detail")}
          </h2>
          <BetDetail
            bet={selectedBet}
            onClose={() => setSelectedId(null)}
            compact
          />
        </Modal>
      ) : null}

      {loginOpen ? (
        <LoginModal
          open
          mode={loginMode}
          onModeChange={setLoginMode}
          onClose={() => setLoginOpen(false)}
        />
      ) : null}
    </div>
  );
}

function TabButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "-mb-px inline-flex items-center gap-2 border-b-2 pb-2.5 pt-1 text-[14px] font-semibold transition",
        active
          ? "border-accent text-ink"
          : "border-transparent text-muted hover:text-ink",
      )}
    >
      {label}
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums",
          active ? "bg-accent text-masthead" : "bg-paper text-muted",
        )}
      >
        {count}
      </span>
    </button>
  );
}

function SportChip({
  active,
  label,
  icon,
  onClick,
}: {
  active: boolean;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition",
        active
          ? "border-accent bg-accent text-masthead"
          : "border-line bg-white text-ink hover:border-accent/40",
      )}
    >
      {icon}
      {label}
    </button>
  );
}

function sportIcon(marketType: string) {
  const sport = sportOf(marketType);
  if (sport === "football") {
    return <FootballIcon className="h-4 w-4 text-pitch" />;
  }
  if (sport === "nba") {
    return <BasketballIcon className="h-4 w-4 text-court" />;
  }
  return <GamepadIcon className="h-4 w-4 text-accent-strong" />;
}

function BetRow({
  bet,
  active,
  onSelect,
}: {
  bet: Bet;
  active: boolean;
  onSelect: () => void;
}) {
  const { t, language } = useLanguage();
  const market = marketTitleForType(bet.marketType, bet.marketTitle, t);
  const selection = betSelectionLabel(bet, t);
  const payout =
    bet.status === "LOST"
      ? 0
      : (bet.payoutCents ?? bet.potentialPayoutCents);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={cn(
        "flex w-full flex-col gap-2 px-4 py-3 text-left transition md:grid md:items-center md:gap-3",
        "md:grid-cols-[minmax(0,1fr)_4rem_5rem_6rem_6rem]",
        active ? "bg-accent/[0.06]" : "hover:bg-paper-soft/70",
      )}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-paper">
          {sportIcon(bet.marketType)}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] font-semibold text-ink">
            {selection}
          </span>
          <span className="block truncate text-[11px] text-muted">
            {market} · {formatDateTime(bet.createdAt, language)}
          </span>
        </span>
      </span>

      <span className="hidden text-right md:block">
        <span className="block text-[10px] uppercase tracking-wide text-subtle md:hidden">
          {t("bets.odds")}
        </span>
        <span className="font-score text-[13px] font-semibold tabular-nums text-ink">
          {formatOdds(Number(bet.odds))}
        </span>
      </span>

      <span className="hidden text-right md:block">
        <span className="font-score text-[13px] font-semibold tabular-nums text-ink">
          {formatMoney(bet.stakeCents, language)}
        </span>
      </span>

      <span className="hidden text-right md:block">
        <span
          className={cn(
            "font-score text-[13px] font-semibold tabular-nums",
            bet.status === "WON"
              ? "text-emerald-600"
              : bet.status === "LOST"
                ? "text-muted"
                : "text-ink",
          )}
        >
          {formatMoney(payout, language)}
        </span>
      </span>

      <span className="flex items-center justify-between gap-2 md:justify-end">
        <span className="flex items-center gap-3 md:hidden">
          <span className="font-score text-[12px] text-muted">
            {formatOdds(Number(bet.odds))} · {formatMoney(bet.stakeCents, language)}
          </span>
        </span>
        <StatusBadge status={bet.status} label={t(betStatusKey(bet.status))} />
      </span>
    </button>
  );
}

function StatusBadge({ status, label }: { status: string; label: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ring-1",
        statusClasses[status] ?? "bg-slate-50 text-slate-500 ring-line",
      )}
    >
      {label}
    </span>
  );
}

function BetDetail({
  bet,
  onClose,
  compact = false,
}: {
  bet: Bet;
  onClose: () => void;
  compact?: boolean;
}) {
  const { t, language } = useLanguage();
  const market = marketTitleForType(bet.marketType, bet.marketTitle, t);
  const selection = betSelectionLabel(bet, t);
  const isOpen = OPEN_STATUSES.has(bet.status);
  const payout =
    bet.status === "LOST"
      ? 0
      : (bet.payoutCents ?? bet.potentialPayoutCents);
  const returnLabel =
    bet.status === "VOID"
      ? t("bets.refund")
      : bet.status === "LOST"
        ? t("bets.result")
        : bet.payoutCents != null
          ? t("bets.payout")
          : t("bets.potentialPayout");

  return (
    <section
      className={cn(
        "rounded-xl border border-line bg-white",
        compact ? "border-0" : "shadow-card",
      )}
    >
      <header className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
            {t("bets.detail")}
          </p>
          <h2 className="mt-0.5 truncate text-[15px] font-bold text-ink">
            {selection}
          </h2>
          <p className="truncate text-[11px] text-muted">{market}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t("bet.close")}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted transition hover:bg-paper hover:text-ink"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </header>

      <div className="space-y-3 px-4 py-3">
        <StatusBadge status={bet.status} label={t(betStatusKey(bet.status))} />

        <dl className="grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              {t("bets.odds")}
            </dt>
            <dd className="mt-0.5 font-score text-sm font-semibold tabular-nums text-ink">
              {formatOdds(Number(bet.odds))}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              {t("bets.stake")}
            </dt>
            <dd className="mt-0.5 font-score text-sm font-semibold tabular-nums text-ink">
              {formatMoney(bet.stakeCents, language)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              {returnLabel}
            </dt>
            <dd className="mt-0.5 font-score text-sm font-semibold tabular-nums text-ink">
              {formatMoney(payout, language)}
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-[0.12em] text-subtle">
              {t("bets.placedAt")}
            </dt>
            <dd className="mt-0.5 text-[11px] font-medium text-ink">
              {formatDateTime(bet.createdAt, language)}
            </dd>
          </div>
        </dl>

        <div className="border-t border-line pt-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-subtle">
            {t("bets.timeline")}
          </p>
          <ol className="mt-2 space-y-2">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-accent" />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-ink">
                  {t("bets.accepted")}
                </span>
                <span className="block text-[11px] text-muted">
                  {formatDateTime(bet.createdAt, language)}
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span
                className={cn(
                  "mt-1 h-2 w-2 shrink-0 rounded-full",
                  isOpen ? "bg-line" : "bg-emerald-500",
                )}
              />
              <span className="min-w-0">
                <span className="block text-[12px] font-semibold text-ink">
                  {isOpen ? t("bets.awaiting") : t("bets.settled")}
                </span>
                <span className="block text-[11px] text-muted">
                  {bet.settledAt
                    ? formatDateTime(bet.settledAt, language)
                    : t("bets.awaitingHint")}
                </span>
              </span>
            </li>
          </ol>
        </div>

        <p className="border-t border-line pt-2 font-mono text-[10px] text-subtle">
          {t("bets.reference")}: {bet.id.slice(0, 8)}
        </p>
      </div>
    </section>
  );
}
