import { useTranslation } from 'react-i18next';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { TopoPattern } from './TopoPattern';
import { MapPin, Users, Zap } from 'lucide-react';

const HERO_COORDINATES = {
  topLeft: '13.7563° N · 100.5018° E',
  bottomRight: '18.7883° N · 98.9853° E',
} as const;

export function AuthHeroPanel() {
  const { t } = useTranslation();

  const steps = [
    { icon: MapPin, titleKey: 'auth.steps.addPlaces', descKey: 'auth.steps.addPlacesDesc' },
    { icon: Users, titleKey: 'auth.steps.voteTogether', descKey: 'auth.steps.voteTogetherDesc' },
    { icon: Zap, titleKey: 'auth.steps.dragToPlan', descKey: 'auth.steps.dragToPlanDesc' },
  ] as const;

  return (
    <div className="relative hidden flex-col overflow-hidden lg:flex lg:w-[60%]">
      <TopoPattern />

      <span className="text-muted-foreground/40 absolute left-6 top-6 font-mono text-[10px] tracking-widest">
        {HERO_COORDINATES.topLeft}
      </span>
      <span className="text-muted-foreground/40 absolute bottom-6 right-6 font-mono text-[10px] tracking-widest">
        {HERO_COORDINATES.bottomRight}
      </span>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-14 py-12 xl:px-20">
        <div className="max-w-lg">
          <div className="mb-6 flex items-center gap-3">
            <div className="border-primary text-primary flex h-10 w-10 items-center justify-center rounded-full border-2">
              <SpinningCompass size={5} />
            </div>
            <span className="font-headline text-primary text-lg font-bold tracking-tight">
              TripFlow
            </span>
          </div>

          <h1 className="font-headline text-foreground mb-5 text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
            {t('auth.heroTitle1')}
            <br />
            {t('auth.heroTitle2')} <span className="text-primary">{t('auth.heroTitle3')}</span>
          </h1>

          <p className="text-muted-foreground mb-10 max-w-sm text-base leading-relaxed">
            {t('auth.heroSubtitle')}
          </p>

          <ol className="relative grid grid-cols-3 gap-3">
            <div
              aria-hidden
              className="border-primary/25 absolute left-[16%] right-[16%] top-[2.25rem] border-t border-dashed"
            />
            {steps.map((step, idx) => (
              <li
                key={step.titleKey}
                className="bg-card border-border relative flex flex-col items-center rounded-2xl border p-4 text-center"
              >
                <div className="bg-card text-primary border-primary/40 relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2">
                  <step.icon className="h-4 w-4" strokeWidth={2} />
                  <span className="bg-primary text-primary-foreground absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-bold tabular-nums">
                    {idx + 1}
                  </span>
                </div>
                <p className="text-foreground text-sm font-semibold">{t(step.titleKey)}</p>
                <p className="text-muted-foreground mt-0.5 truncate text-xs">{t(step.descKey)}</p>
              </li>
            ))}
          </ol>

          <p className="text-muted-foreground/50 mt-3 text-xs">
            {t('auth.copyright', { year: new Date().getFullYear() })}
          </p>
        </div>
      </div>
    </div>
  );
}
