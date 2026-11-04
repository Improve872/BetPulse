"use client";

import { cn } from "@/lib/format";
import { useLanguage } from "@/lib/i18n";

export function SiteFooter({
  variant = "light",
}: {
  variant?: "light" | "dark";
}) {
  const { t } = useLanguage();

  return (
    <footer
      className={cn(
        "border-t",
        variant === "dark"
          ? "border-arena-line bg-arena-soft text-arena-muted"
          : "border-line bg-surface text-muted",
      )}
    >
      <div className="mx-auto flex max-w-[1320px] items-center px-4 pb-24 pt-6 text-xs sm:px-6 lg:px-8 lg:pb-6">
        <p>{t("footer.project")}</p>
      </div>
    </footer>
  );
}
