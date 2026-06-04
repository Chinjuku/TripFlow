import { Trans, useTranslation } from 'react-i18next';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { HERO_COORDINATES, LOGIN_STEPS } from '@/utils/auth';
import { TopoPattern } from './TopoPattern';

export function AuthHeroPanel() {
  const { t } = useTranslation();

  return (
    <div className="relative hidden flex-col overflow-hidden lg:flex lg:w-[60%]">
      <TopoPattern />

      <span className="text-muted-foreground/40 absolute left-6 top-6 font-mono text-[10px] tracking-widest">
        {HERO_COORDINATES.topLeft}
      </span>

      <div className="absolute inset-x-6 bottom-6 z-10 flex items-center justify-between gap-4">
        <span className="text-muted-foreground/50 text-xs">
          {t('auth.copyright', { year: new Date().getFullYear() })}
        </span>
        <span className="text-muted-foreground/40 font-mono text-[10px] tracking-widest">
          {HERO_COORDINATES.bottomRight}
        </span>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center px-14 py-12 xl:px-20">
        <div className="max-w-xl">
          <div className="mb-6 flex items-center gap-3">
            <div className="border-primary text-primary flex h-10 w-10 items-center justify-center rounded-full border-2">
              <SpinningCompass size={5} />
            </div>
            <span className="font-headline text-primary text-lg font-bold tracking-tight">
              TripFlow
            </span>
          </div>

          <h1 className="font-headline text-foreground mb-5 text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
            <Trans
              i18nKey="auth.heroTitle"
              components={{ 1: <br />, 2: <span className="text-primary" /> }}
            />
          </h1>

          <p className="text-muted-foreground mb-10 max-w-sm text-base leading-relaxed">
            {t('auth.heroSubtitle')}
          </p>

          <ol className="relative grid grid-cols-3 gap-3">
            <div
              aria-hidden
              className="border-primary/25 absolute left-[16%] right-[16%] top-[2.25rem] border-t border-dashed"
            />
            {LOGIN_STEPS.map((step, idx) => (
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
        </div>
      </div>
    </div>
  );
}
