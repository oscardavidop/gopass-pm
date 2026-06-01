import { WEB_ENV } from '@/config/env';

export const DEFAULT_LOCALE = WEB_ENV.defaultLocale;

export function getSupportedLocales(): string[] {
  const locales = WEB_ENV.supportedLocales;

  if (locales.length === 0) return [DEFAULT_LOCALE];
  return Array.from(new Set(locales));
}

export function normalizeLocale(locale?: string | null): string {
  if (!locale) return DEFAULT_LOCALE;
  const safe = locale.toLowerCase().split('-')[0];
  const supported = getSupportedLocales();
  return supported.includes(safe) ? safe : DEFAULT_LOCALE;
}

export function detectBrowserLocale(): string {
  if (typeof navigator === 'undefined') return DEFAULT_LOCALE;
  return normalizeLocale(navigator.language);
}

export function getLocaleLabel(locale: string): string {
  try {
    const safe = normalizeLocale(locale);
    const langLabel = new Intl.DisplayNames([safe], { type: 'language' }).of(safe) || safe.toUpperCase();
    return langLabel.charAt(0).toUpperCase() + langLabel.slice(1);
  } catch {
    return locale.toUpperCase();
  }
}
