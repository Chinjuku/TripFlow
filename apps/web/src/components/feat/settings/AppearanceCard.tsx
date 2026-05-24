import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Globe, Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemeToggle } from '@/components/shared/ThemeToggle';
import { useLocale } from '@/lib/i18n/useLocale';

export function AppearanceCard() {
  const { t } = useTranslation();
  const { locale, locales, meta, setLocale } = useLocale();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <Palette className="text-primary h-5 w-5" strokeWidth={1.75} />
          {t('settings.appearance')}
        </CardTitle>
        <CardDescription>{t('settings.appearanceDesc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Theme Toggle */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-foreground text-sm font-medium">{t('settings.theme')}</p>
            <p className="text-muted-foreground text-xs">
              {t('settings.themeDesc')}
            </p>
          </div>
          <ThemeToggle />
        </div>

        {/* Language Selector */}
        <div className="border-border border-t pt-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 text-primary flex h-8 w-8 items-center justify-center rounded-lg">
                <Globe className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div>
                <p className="text-foreground text-sm font-medium">{t('settings.language')}</p>
                <p className="text-muted-foreground text-xs">
                  {t('settings.languageDesc')}
                </p>
              </div>
            </div>
            <div className="flex gap-1 rounded-xl border border-border bg-muted/50 p-1">
              {locales.map((code) => {
                const isActive = code === locale;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => void setLocale(code)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-card text-foreground shadow-sm border border-border'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <span>{meta[code].flag}</span>
                    {meta[code].label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
