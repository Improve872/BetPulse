"use client";

import { useLanguage } from "@/lib/i18n";

export function SiteFooter() {
  const { t } = useLanguage();

  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto flex max-w-[1320px] flex-col gap-2 px-4 pb-24 pt-6 text-xs text-muted sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:pb-6">
        <p>{t("footer.project")}</p>
        <p className="font-medium text-muted">{t("footer.legal")}</p>
      </div>
    </footer>
  );
}
