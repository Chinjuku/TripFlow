import type { en } from './locales/en';

/**
 * Augment react-i18next so `t()` becomes type-safe: keys are autocompleted
 * and misspellings turn into TS errors. We use `en` as the canonical
 * resource shape — every other locale must match the same key tree.
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
