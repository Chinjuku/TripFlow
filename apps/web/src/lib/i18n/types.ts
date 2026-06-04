import type { ParseKeys } from 'i18next';
import type { en } from './locales/en';

/**
 * Augment react-i18next so `t()` becomes type-safe: keys are autocompleted
 * and misspellings turn into TS errors. We use `en` as the canonical
 * resource shape - every other locale must match the same key tree.
 */
declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'translation';
    resources: {
      translation: typeof en;
    };
    returnNull: false;
  }
}

/**
 * Every valid `t()` key, derived from the resource tree above. Use this to
 * type any value that will later be passed to `t(...)` (e.g. config objects
 * that carry i18n keys) so a typo is caught at the definition, not the call.
 */
export type TranslationKey = ParseKeys;
