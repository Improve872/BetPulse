"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn, formatDateTime } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";
import {
  deleteStream,
  getStreams,
  saveStream,
  setStreamEnabled,
  type AdminStream,
  type StreamProvider,
} from "@/lib/streams";

type Scope = "match" | "league";

export function AdminStreamsPage() {
  const { t, language } = useLanguage();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [streams, setStreams] = useState<AdminStream[]>([]);
  const [scope, setScope] = useState<Scope>("match");
  const [matchId, setMatchId] = useState("");
  const [leagueId, setLeagueId] = useState("");
  const [provider, setProvider] = useState<StreamProvider>("TWITCH");
  const [channel, setChannel] = useState("");
  const [label, setLabel] = useState("");
  const [fallbackUrl, setFallbackUrl] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const isAdmin = user?.roles.includes("ADMIN") ?? false;

  const load = useCallback(async () => {
    if (!isAdmin) {
      return;
    }
    setError("");
    try {
      setStreams(await getStreams());
    } catch (caught) {
      setError(
        caught instanceof ApiError && caught.status === 403
          ? t("admin.denied")
          : t("admin.streamsError"),
      );
    }
  }, [isAdmin, t]);

  useEffect(() => {
    void load();
  }, [load]);

  const resetForm = () => {
    setScope("match");
    setMatchId("");
    setLeagueId("");
    setProvider("TWITCH");
    setChannel("");
    setLabel("");
    setFallbackUrl("");
    setEnabled(true);
  };

  const startEdit = (stream: AdminStream) => {
    setScope(stream.matchId ? "match" : "league");
    setMatchId(stream.matchId ?? "");
    setLeagueId(stream.leagueId ? String(stream.leagueId) : "");
    setProvider(stream.provider);
    setChannel(stream.channelOrVideo);
    setLabel(stream.label ?? "");
    setFallbackUrl(stream.fallbackUrl ?? "");
    setEnabled(stream.enabled);
    setError("");
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await saveStream({
        matchId: scope === "match" ? matchId.trim() : null,
        leagueId:
          scope === "league" && leagueId.trim()
            ? Number(leagueId.trim())
            : null,
        provider,
        channelOrVideo: channel.trim(),
        label: label.trim() || null,
        fallbackUrl: fallbackUrl.trim() || null,
        enabled,
      });
      setNotice(t("admin.streamSaved"));
      resetForm();
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.streamsError"),
      );
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (stream: AdminStream) => {
    setError("");
    try {
      await setStreamEnabled(stream.id, !stream.enabled);
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.streamsError"),
      );
    }
  };

  const remove = async (stream: AdminStream) => {
    if (!window.confirm(t("admin.streamDeleteConfirm"))) {
      return;
    }
    setError("");
    try {
      await deleteStream(stream.id);
      setNotice(t("admin.streamDeleted"));
      await load();
    } catch (caught) {
      setError(
        caught instanceof ApiError ? caught.message : t("admin.streamsError"),
      );
    }
  };

  return (
    <div className="min-h-screen bg-paper">
      <SiteHeader
        game="dota2"
        activeView="all"
        onGameChange={() => undefined}
        onNavigate={() => router.push("/")}
        onLogin={() => router.push("/")}
        onRegister={() => router.push("/")}
      />

      <main className="mx-auto max-w-[1100px] px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent-strong">
              BetPulse
            </p>
            <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-ink">
              {t("admin.streamsTitle")}
            </h1>
            <p className="mt-1 text-sm text-muted">
              {t("admin.streamsSubtitle")}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="text-xs font-semibold text-accent-strong hover:underline"
            >
              {t("admin.bets")}
            </Link>
            <Link
              href="/admin/markets"
              className="text-xs font-semibold text-accent-strong hover:underline"
            >
              {t("admin.markets")}
            </Link>
          </div>
        </div>

        {!loading && !isAdmin ? (
          <p className="mt-6 rounded-2xl border border-line bg-surface p-6 text-sm text-muted">
            {t("admin.denied")}
          </p>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {notice}
          </p>
        ) : null}

        {isAdmin ? (
          <>
            <form
              onSubmit={handleSubmit}
              className="mt-5 rounded-2xl border border-line bg-surface p-4 shadow-card sm:p-5"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-ink">
                  {t("admin.streamFormTitle")}
                </h2>
                <p className="text-[11px] text-muted">
                  {t("admin.streamsHint")}
                </p>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <fieldset className="sm:col-span-2">
                  <legend className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
                    {t("admin.streamScope")}
                  </legend>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setScope("match")}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                        scope === "match"
                          ? "border-accent/40 bg-accent/10 text-accent-strong"
                          : "border-line bg-slate-50 text-muted hover:text-ink",
                      )}
                    >
                      {t("admin.streamScopeMatch")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setScope("league")}
                      className={cn(
                        "rounded-lg border px-3 py-1.5 text-xs font-semibold transition",
                        scope === "league"
                          ? "border-accent/40 bg-accent/10 text-accent-strong"
                          : "border-line bg-slate-50 text-muted hover:text-ink",
                      )}
                    >
                      {t("admin.streamScopeLeague")}
                    </button>
                  </div>
                </fieldset>

                {scope === "match" ? (
                  <label className="block text-xs font-semibold text-ink">
                    {t("admin.streamMatchId")}
                    <input
                      value={matchId}
                      onChange={(event) => setMatchId(event.target.value)}
                      required
                      placeholder="9075057224"
                      className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
                  </label>
                ) : (
                  <label className="block text-xs font-semibold text-ink">
                    {t("admin.streamLeagueId")}
                    <input
                      value={leagueId}
                      onChange={(event) => setLeagueId(event.target.value)}
                      required
                      inputMode="numeric"
                      placeholder="19944"
                      className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                    />
                  </label>
                )}

                <label className="block text-xs font-semibold text-ink">
                  {t("admin.streamProvider")}
                  <select
                    value={provider}
                    onChange={(event) =>
                      setProvider(event.target.value as StreamProvider)
                    }
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  >
                    <option value="TWITCH">Twitch</option>
                    <option value="YOUTUBE">YouTube</option>
                  </select>
                </label>

                <label className="block text-xs font-semibold text-ink">
                  {t("admin.streamChannel")}
                  <input
                    value={channel}
                    onChange={(event) => setChannel(event.target.value)}
                    required
                    placeholder={
                      provider === "TWITCH" ? "dota2" : "video-id"
                    }
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </label>

                <label className="block text-xs font-semibold text-ink">
                  {t("admin.streamLabel")}
                  <input
                    value={label}
                    onChange={(event) => setLabel(event.target.value)}
                    placeholder={t("admin.streamLabelPlaceholder")}
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </label>

                <label className="block text-xs font-semibold text-ink sm:col-span-2">
                  {t("admin.streamFallback")}
                  <input
                    value={fallbackUrl}
                    onChange={(event) => setFallbackUrl(event.target.value)}
                    placeholder="https://twitch.tv/..."
                    className="mt-1.5 w-full rounded-lg border border-line bg-white px-3 py-2 text-sm font-normal text-ink outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/15"
                  />
                </label>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-ink">
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => setEnabled(event.target.checked)}
                    className="h-4 w-4 rounded border-line accent-orange-600"
                  />
                  {t("admin.streamEnabled")}
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-navy transition hover:bg-accent-bright disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? t("admin.saving") : t("admin.streamSave")}
                </button>
              </div>
            </form>

            <ul className="mt-5 space-y-3">
              {streams.map((stream) => (
                <li
                  key={stream.id}
                  className="rounded-2xl border border-line bg-surface p-4 shadow-card"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-navy px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                          {stream.provider}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-muted">
                          {stream.matchId
                            ? `${t("admin.streamScopeMatch")} ${stream.matchId}`
                            : `${t("admin.streamScopeLeague")} ${stream.leagueId}`}
                        </span>
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                            stream.enabled
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-slate-100 text-muted",
                          )}
                        >
                          {stream.enabled
                            ? t("admin.streamActive")
                            : t("admin.streamInactive")}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-semibold text-ink">
                        {stream.label || stream.channelOrVideo}
                      </p>
                      <p className="mt-0.5 text-xs text-muted">
                        {stream.channelOrVideo} ·{" "}
                        {formatDateTime(stream.updatedAt, language)}
                      </p>
                      {stream.fallbackUrl ? (
                        <p className="mt-1 truncate text-[11px] text-muted">
                          {stream.fallbackUrl}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(stream)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50"
                      >
                        {t("admin.edit")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void toggle(stream)}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-slate-50"
                      >
                        {stream.enabled
                          ? t("admin.streamDisable")
                          : t("admin.streamEnable")}
                      </button>
                      <button
                        type="button"
                        onClick={() => void remove(stream)}
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50"
                      >
                        {t("admin.streamDelete")}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
              {streams.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-line bg-surface p-6 text-sm text-muted">
                  {t("admin.streamEmpty")}
                </li>
              ) : null}
            </ul>
          </>
        ) : null}
      </main>

      <SiteFooter />
    </div>
  );
}
