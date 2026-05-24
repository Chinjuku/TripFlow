export const SUPPORTED_LOCALES = ['en', 'th'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'en';
export const LOCALE_STORAGE_KEY = 'tripflow-lang';

export const LOCALE_META: Record<Locale, { label: string; flag: string }> = {
  en: { label: 'English', flag: '🇺🇸' },
  th: { label: 'ไทย', flag: '🇹🇭' },
};

export function isLocale(value: string): value is Locale {
  return (SUPPORTED_LOCALES as readonly string[]).includes(value);
}

/** Normalise a BCP-47 tag (e.g. `en-US`) to a supported locale, or fall back. */
export function resolveLocale(tag: string | undefined | null): Locale {
  if (!tag) return DEFAULT_LOCALE;
  if (isLocale(tag)) return tag;
  const base = tag.split('-')[0] ?? '';
  return isLocale(base) ? base : DEFAULT_LOCALE;
}
