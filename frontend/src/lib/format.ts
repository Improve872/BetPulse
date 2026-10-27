export function cn(
  ...values: Array<string | false | null | undefined>
): string {
  return values.filter(Boolean).join(" ");
}

export function formatGameTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDuration(totalSeconds: number): string {
  return `${Math.max(1, Math.round(totalSeconds / 60))} min`;
}

function normalizeIntlSpacing(value: string): string {
  return value.replace(/[\u00a0\u202f]/g, " ");
}

export function formatNumber(value: number, language: "es" | "en"): string {
  return normalizeIntlSpacing(
    new Intl.NumberFormat(language === "es" ? "es-PE" : "en-US", {
      maximumFractionDigits: 0,
    }).format(value),
  );
}

export function formatUpdatedAt(iso: string, language: "es" | "en"): string {
  return normalizeIntlSpacing(
    new Intl.DateTimeFormat(language === "es" ? "es-PE" : "en-US", {
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date(iso)),
  );
}

export function formatStartTime(
  unixSeconds: number,
  language: "es" | "en",
): string {
  return normalizeIntlSpacing(
    new Intl.DateTimeFormat(language === "es" ? "es-PE" : "en-US", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "America/Lima",
    }).format(new Date(unixSeconds * 1000)),
  );
}

export function getInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return "??";
  }
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
}
