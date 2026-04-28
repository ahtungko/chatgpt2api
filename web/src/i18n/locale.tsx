"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type AppLocale = "zh" | "en";

export const DEFAULT_APP_LOCALE: AppLocale = "zh";
export const APP_LOCALE_STORAGE_KEY = "chatgpt2api:locale";

let runtimeLocale: AppLocale = DEFAULT_APP_LOCALE;

function applyDocumentLanguage(locale: AppLocale) {
  if (typeof document === "undefined") {
    return;
  }
  document.documentElement.lang = locale === "en" ? "en" : "zh-CN";
}

export function isAppLocale(value: string | null): value is AppLocale {
  return value === "zh" || value === "en";
}

export function detectPreferredAppLocale(): AppLocale {
  if (typeof window === "undefined") {
    return runtimeLocale;
  }

  const stored = window.localStorage.getItem(APP_LOCALE_STORAGE_KEY);
  if (isAppLocale(stored)) {
    return stored;
  }

  const languages = [navigator.language, ...(navigator.languages || [])]
    .filter(Boolean)
    .map((item) => item.toLowerCase());

  return languages.some((item) => item.startsWith("en")) ? "en" : DEFAULT_APP_LOCALE;
}

export function getCurrentAppLocale(): AppLocale {
  if (typeof window !== "undefined") {
    runtimeLocale = detectPreferredAppLocale();
  }
  return runtimeLocale;
}

export function setCurrentAppLocale(locale: AppLocale) {
  runtimeLocale = locale;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(APP_LOCALE_STORAGE_KEY, locale);
  }
  applyDocumentLanguage(locale);
}

export function translateByLocale(locale: AppLocale, zh: string, en: string) {
  return locale === "en" ? en : zh;
}

export function translate(zh: string, en: string) {
  return translateByLocale(getCurrentAppLocale(), zh, en);
}

type AppLocaleContextValue = {
  locale: AppLocale;
  isEnglish: boolean;
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
};

const AppLocaleContext = createContext<AppLocaleContextValue | null>(null);

export function AppLocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(DEFAULT_APP_LOCALE);

  useEffect(() => {
    const nextLocale = detectPreferredAppLocale();
    runtimeLocale = nextLocale;
    applyDocumentLanguage(nextLocale);
    const timer = window.setTimeout(() => {
      setLocaleState((current) => (current === nextLocale ? current : nextLocale));
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    runtimeLocale = locale;
    applyDocumentLanguage(locale);
  }, [locale]);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setCurrentAppLocale(nextLocale);
    setLocaleState(nextLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === "en" ? "zh" : "en");
  }, [locale, setLocale]);

  const value = useMemo<AppLocaleContextValue>(
    () => ({
      locale,
      isEnglish: locale === "en",
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return <AppLocaleContext.Provider value={value}>{children}</AppLocaleContext.Provider>;
}

export function useAppLocale() {
  const context = useContext(AppLocaleContext);
  if (!context) {
    throw new Error("useAppLocale must be used within AppLocaleProvider");
  }
  return context;
}

export function useTranslate() {
  const { locale } = useAppLocale();
  return useCallback((zh: string, en: string) => translateByLocale(locale, zh, en), [locale]);
}
