import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@trip-flow/ui/components/card';
import { Palette } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ThemePicker } from './appearance/ThemePicker';
import { ColorThemePicker } from './appearance/ColorThemePicker';
import { LanguagePicker } from './appearance/LanguagePicker';

export function AppearanceCard() {
  const { t } = useTranslation();

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
        {/* Theme - visual mock-up picker */}
        <div className="space-y-3">
          <div>
            <p className="text-foreground text-sm font-medium">{t('settings.theme')}</p>
            <p className="text-muted-foreground text-xs">{t('settings.themeDesc')}</p>
          </div>
          <ThemePicker />
        </div>

        {/* Color Theme - visual color swatch picker */}
        <div className="border-border space-y-3 border-t pt-5">
          <div>
            <p className="text-foreground text-sm font-medium">{t('settings.colorTheme')}</p>
            <p className="text-muted-foreground text-xs">{t('settings.colorThemeDesc')}</p>
          </div>
          <ColorThemePicker />
        </div>

        {/* Language - visual card picker */}
        <div className="border-border space-y-3 border-t pt-5">
          <div>
            <p className="text-foreground text-sm font-medium">{t('settings.language')}</p>
            <p className="text-muted-foreground text-xs">{t('settings.languageDesc')}</p>
          </div>
          <LanguagePicker />
        </div>
      </CardContent>
    </Card>
  );
}
