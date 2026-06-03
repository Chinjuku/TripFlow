import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';
import type { ColorTheme } from '@/types/theme';

export function ColorThemePicker() {
  const { t } = useTranslation();
  const { colorTheme, setColorTheme } = useTheme();

  const options: {
    value: ColorTheme;
    labelKey:
      | 'settings.colorThemeVerdant'
      | 'settings.colorThemeTheory'
      | 'settings.colorThemeBlue'
      | 'settings.colorThemePurple';
    colorClass: string;
  }[] = [
    {
      value: 'default',
      labelKey: 'settings.colorThemeVerdant',
      colorClass: 'bg-[#059669]', // emerald-600
    },
    {
      value: 'blue',
      labelKey: 'settings.colorThemeBlue',
      colorClass: 'bg-[#2563eb]', // blue-600
    },
    {
      value: 'purple',
      labelKey: 'settings.colorThemePurple',
      colorClass: 'bg-[#7c3aed]', // violet-600
    },
    {
      value: 'yellow',
      labelKey: 'settings.colorThemeTheory',
      colorClass: 'bg-[#eab308]', // yellow-500
    },
  ];

  return (
    <div role="radiogroup" aria-label={t('settings.colorTheme')} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {options.map((opt) => {
        const isActive = opt.value === colorTheme;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setColorTheme(opt.value)}
            className={`focus-visible:ring-ring flex items-center gap-3 rounded-xl border-2 p-3 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
              isActive ? 'border-primary shadow-sm' : 'border-border hover:border-primary/40'
            }`}
          >
            <span className={`w-5 h-5 rounded-full ${opt.colorClass} border border-black/10 shrink-0`} aria-hidden />
            <span className="text-foreground flex-1 text-sm font-semibold">
              {t(opt.labelKey)}
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
