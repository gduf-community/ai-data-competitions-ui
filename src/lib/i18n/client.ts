"use client";

import { useSyncExternalStore } from "react";

import {
  defaultLocale,
  getClientLocale,
  translateText,
  type AppLocale,
} from "@/lib/i18n";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("languagechange", callback);
  return () => {
    window.removeEventListener("languagechange", callback);
  };
}

function getServerSnapshot() {
  return defaultLocale;
}

export function useI18nText() {
  const locale = useSyncExternalStore(subscribe, getClientLocale, getServerSnapshot);

  return {
    locale,
    tt(value: string) {
      return translateText(value, locale);
    },
  };
}

export function confirmI18n(message: string, locale?: AppLocale) {
  return window.confirm(translateText(message, locale ?? getClientLocale()));
}

export function promptI18n(
  message: string,
  defaultValue?: string,
  locale?: AppLocale,
) {
  const resolvedLocale = locale ?? getClientLocale();
  return window.prompt(
    translateText(message, resolvedLocale),
    defaultValue === undefined
      ? undefined
      : translateText(defaultValue, resolvedLocale),
  );
}
