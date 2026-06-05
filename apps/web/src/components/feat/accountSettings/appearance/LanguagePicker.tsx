import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useLocale } from '@/lib/i18n/useLocale';

/**
 * Language picker as a pair of visual cards (mirrors the theme picker):
 * flag + label + selected tick. Locale list + metadata come from `useLocale`.
 */
export function LanguagePicker() {
  const { t } = useTranslation();
  const { locale, locales, meta, setLocale } = useLocale();

  return (
    <div role="radiogroup" aria-label={t('settings.language')} className="grid grid-cols-2 gap-3">
      {locales.map((code) => {
        const isActive = code === locale;
        return (
          <button
            key={code}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => void setLocale(code)}
            className={`focus-visible:ring-ring flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isActive ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40'
            }`}
          >
            <span className="text-2xl leading-none" aria-hidden>
              {meta[code].flag}
            </span>
            <span className="text-foreground flex-1 text-sm font-semibold">
              {(() => {
                const label = meta[code].label;
                const translated = t(code === 'en' ? 'settings.english' : 'settings.thai');
                return label === translated ? label : `${label} (${translated})`;
              })()}
            </span>
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full border transition-colors ${
                isActive ? 'border-primary bg-primary text-primary-foreground' : 'border-border'
              }`}
            >
              {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
          </button>
        );
      })}
    </div>
  );
}
