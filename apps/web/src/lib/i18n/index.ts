import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import { en } from './locales/en';
import { th } from './locales/th';
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  resolveLocale,
} from './config';
import './types'; // activate t() key autocompletion + type-checking

/**
 * Resources are keyed by namespace so feature files stay independent in
 * source. They're surfaced under the default `translation` namespace so
 * existing `t('settings.theme')` call-sites keep working — the
 * `translation` object below is the union of every per-feature file.
 */
const translation = { en, th } as const;

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: translation.en },
      th: { translation: translation.th },
    },
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: SUPPORTED_LOCALES as unknown as string[],
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    returnNull: false,
    interpolation: {
      escapeValue: false, // React already handles XSS
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: LOCALE_STORAGE_KEY,
      caches: ['localStorage'],
    },
    react: {
      useSuspense: false,
    },
  });

const syncHtmlLang = (lng: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.lang = resolveLocale(lng);
};

// `languageChanged` fires on every switch; do an initial sync too so the
// first paint reflects the detected language (the static `lang` in
// index.html only covers the very first render before i18n hydrates).
syncHtmlLang(i18n.language ?? DEFAULT_LOCALE);
i18n.on('languageChanged', syncHtmlLang);

export { i18n };
export default i18n;
