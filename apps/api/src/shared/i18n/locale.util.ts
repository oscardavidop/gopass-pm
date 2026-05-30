export const DEFAULT_LOCALE = (process.env.DEFAULT_LOCALE || 'en').toLowerCase();

export function getSupportedLocales(): string[] {
  const raw = process.env.SUPPORTED_LOCALES || 'en,es';
  return raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function normalizeLocale(locale?: string | null): string {
  if (!locale) return DEFAULT_LOCALE;
  const base = locale.toLowerCase().split('-')[0];
  const supported = getSupportedLocales();
  return supported.includes(base) ? base : DEFAULT_LOCALE;
}

export function getLocaleFromAcceptLanguage(header?: string | null): string {
  if (!header) return DEFAULT_LOCALE;

  const candidates = header
    .split(',')
    .map((part) => part.split(';')[0]?.trim())
    .filter(Boolean);

  for (const candidate of candidates) {
    const locale = normalizeLocale(candidate);
    if (locale) return locale;
  }

  return DEFAULT_LOCALE;
}
