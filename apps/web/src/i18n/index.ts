import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_LOCALE, getSupportedLocales, normalizeLocale } from './locale';

const localeModules = import.meta.glob('./locales/*/*.json');

async function loadLocaleResources(locale: string) {
  const safeLocale = normalizeLocale(locale);
  const entries = Object.entries(localeModules).filter(([path]) => path.includes(`/locales/${safeLocale}/`));

  await Promise.all(
    entries.map(async ([path, loader]) => {
      const module = (await loader()) as { default: Record<string, unknown> };
      const namespace = path.split('/').pop()?.replace('.json', '') || 'common';
      i18n.addResourceBundle(safeLocale, namespace, module.default, true, true);
    }),
  );
}

export async function initI18n(initialLocale?: string) {
  const locale = normalizeLocale(initialLocale || DEFAULT_LOCALE);

  await i18n.use(initReactI18next).init({
    lng: locale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: getSupportedLocales(),
    ns: ['common'],
    defaultNS: 'common',
    interpolation: { escapeValue: false },
    returnNull: false,
    partialBundledLanguages: true,
    resources: {},
  });

  await loadLocaleResources(DEFAULT_LOCALE);
  if (locale !== DEFAULT_LOCALE) {
    await loadLocaleResources(locale);
  }
}

export async function changeLocale(locale: string) {
  const safe = normalizeLocale(locale);
  await loadLocaleResources(safe);
  await i18n.changeLanguage(safe);
}

export default i18n;
