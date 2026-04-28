"use client";

import { useTranslate } from "@/i18n/locale";

export function SettingsHeader() {
  const t = useTranslate();

  return (
    <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div className="space-y-1">
        <div className="text-xs font-semibold tracking-[0.18em] text-stone-500 uppercase">Settings</div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("设置", "Settings")}</h1>
      </div>
    </section>
  );
}
