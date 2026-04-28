"use client";

import { Languages } from "lucide-react";

import { useAppLocale } from "@/i18n/locale";

import { Button } from "./ui/button";

type LocaleSwitchButtonProps = {
  className?: string;
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "default" | "sm" | "lg" | "icon";
};

export function LocaleSwitchButton({
  className,
  variant = "outline",
  size = "sm",
}: LocaleSwitchButtonProps) {
  const { locale, toggleLocale } = useAppLocale();

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={className}
      onClick={toggleLocale}
      aria-label={locale === "en" ? "切换到中文" : "Switch to English"}
    >
      <Languages className="size-4" />
      {locale === "en" ? "中文" : "English"}
    </Button>
  );
}
