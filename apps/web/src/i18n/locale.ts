export const DEFAULT_LOCALE = (import.meta.env.VITE_DEFAULT_LOCALE || 'en').toLowerCase();

export function getSupportedLocales(): string[] {
  const raw = import.meta.env.VITE_SUPPORTED_LOCALES || 'en,es';
  const locales = raw
    .split(',')
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

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
    return new Intl.DisplayNames([safe], { type: 'language' }).of(safe) || safe.toUpperCase();
  } catch {
    return locale.toUpperCase();
  }
}
