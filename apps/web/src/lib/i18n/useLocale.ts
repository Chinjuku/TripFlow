import { useTranslation } from 'react-i18next';
import { LOCALE_META, SUPPORTED_LOCALES, type Locale, resolveLocale } from './config';

/**
 * Wraps react-i18next with the app's locale vocabulary so callers don't
 * touch raw `i18n.language` strings (which may be `en-US` etc.). Returns
 * the active locale, the list of locales the picker should render, and a
 * setter that persists via the language detector.
 */
export function useLocale() {
  const { i18n } = useTranslation();
  const locale = resolveLocale(i18n.language);

  return {
    locale,
    locales: SUPPORTED_LOCALES,
    meta: LOCALE_META,
    setLocale: (next: Locale) => i18n.changeLanguage(next),
  };
}
