import i18n from './index';

export function translateByKey(i18nKey?: string, i18nParams?: Record<string, unknown>, fallback?: string) {
  if (!i18nKey) return fallback || '';
  const text = String(i18n.t(i18nKey, (i18nParams || {}) as any));
  if (text === i18nKey && fallback) return fallback;
  return text;
}
