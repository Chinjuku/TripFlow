import { Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useTheme } from '@/hooks/useTheme';
import type { Theme } from '@/types/theme';
import { useTranslation } from 'react-i18next';

/**
 * Theme picker rendered as visual mock-ups instead of a toggle. Each card
 * paints a tiny app shell (sidebar + content rows) using that theme's actual
 * colours, so the choice reads as "this is what the app will look like".
 *
 * Colours are hard-coded HSL pulled from the `--*` design tokens in
 * `@/styles/ui-tokens.css` - we can't rely on the live CSS vars here
 * because both previews must show *both* themes at once, not the active one.
 */
interface Swatch {
  background: string;
  card: string;
  foreground: string;
  muted: string;
  border: string;
  primary: string;
}

const PREVIEWS: { value: Theme; labelKey: 'settings.themeLight' | 'settings.themeDark'; swatch: Swatch }[] = [
  {
    value: 'light',
    labelKey: 'settings.themeLight',
    swatch: {
      background: 'hsl(210 40% 98%)',
      card: 'hsl(0 0% 100%)',
      foreground: 'hsl(222 47% 11%)',
      muted: 'hsl(210 40% 96%)',
      border: 'hsl(214 32% 91%)',
      primary: 'hsl(160 84% 31%)',
    },
  },
  {
    value: 'dark',
    labelKey: 'settings.themeDark',
    swatch: {
      background: 'hsl(222 47% 11%)',
      card: 'hsl(222 47% 14%)',
      foreground: 'hsl(210 40% 98%)',
      muted: 'hsl(217 33% 18%)',
      border: 'hsl(217 33% 22%)',
      primary: 'hsl(160 84% 31%)',
    },
  },
];

export function ThemePicker() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <div role="radiogroup" aria-label="Theme preference" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {PREVIEWS.map(({ value, labelKey, swatch }) => {
        const isActive = theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setTheme(value)}
            className={cn(
              'group focus-visible:ring-ring relative overflow-hidden rounded-xl border-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
              isActive
                ? 'border-primary shadow-sm'
                : 'border-border hover:border-primary/40',
            )}
          >
            {/* Mini app-shell mock-up painted in the theme's own colours. */}
            <div className="flex h-36 w-full gap-1.5 p-2.5" style={{ background: swatch.background }}>
              {/* Sidebar */}
              <div
                className="flex w-1/3 flex-col gap-1 rounded-md p-1.5"
                style={{ background: swatch.card, border: `1px solid ${swatch.border}` }}
              >
                <span className="h-1.5 w-3/4 rounded-full" style={{ background: swatch.primary }} />
                <span className="h-1.5 w-full rounded-full" style={{ background: swatch.muted }} />
                <span className="h-1.5 w-full rounded-full" style={{ background: swatch.muted }} />
              </div>
              {/* Content */}
              <div
                className="flex flex-1 flex-col gap-1.5 rounded-md p-1.5"
                style={{ background: swatch.card, border: `1px solid ${swatch.border}` }}
              >
                <span className="h-2 w-1/2 rounded-full" style={{ background: swatch.foreground }} />
                <span className="h-1.5 w-full rounded-full" style={{ background: swatch.muted }} />
                <span className="h-1.5 w-5/6 rounded-full" style={{ background: swatch.muted }} />
                <span
                  className="mt-auto h-2.5 w-1/3 rounded-full"
                  style={{ background: swatch.primary }}
                />
              </div>
            </div>

            {/* Label + selected indicator */}
            <div className="bg-card border-border flex items-center justify-between border-t px-3 py-2">
              <span className="text-foreground text-sm font-semibold">{t(labelKey)}</span>
              <span
                className={cn(
                  'flex h-4 w-4 items-center justify-center rounded-full border transition-colors',
                  isActive
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-border',
                )}
              >
                {isActive && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
