import { Lock, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { GoogleIcon } from './GoogleIcon';

export function LoginSignInPanel() {
  const { signingIn, signIn } = useGoogleSignIn();
  const { t } = useTranslation();

  const trustPoints = [
    { icon: Lock, label: t('auth.trustSignIn') },
    { icon: ShieldCheck, label: t('auth.trustPrivacy') },
  ] as const;

  return (
    <div className="lg:border-border relative flex flex-1 flex-col items-center justify-center px-6 lg:w-[40%] lg:flex-none lg:border-l lg:px-12 xl:px-16">
      <div className="relative z-10 w-full max-w-sm">
        <div className="bg-card border-border rounded-3xl border p-8 shadow-xl">
          <div className="mb-7 flex flex-col items-center gap-2 lg:hidden">
            <div className="border-primary text-primary flex h-12 w-12 items-center justify-center rounded-full border-2">
              <SpinningCompass size={6} />
            </div>
            <span className="font-headline text-primary text-xl font-bold tracking-tight">
              TripFlow
            </span>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="font-headline text-foreground mb-1.5 text-2xl font-bold tracking-tight">
              {t(getGreetingKey())}
            </h2>
            <p className="text-muted-foreground text-sm">
              {t('auth.signInToContinue')}
            </p>
          </div>

          <Button
            id="google-sign-in-button"
            onClick={signIn}
            disabled={signingIn}
            variant="outline"
            className="border-border text-foreground hover:bg-primary/5 hover:border-primary/40 hover:text-foreground h-12 w-full cursor-pointer gap-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md disabled:cursor-wait disabled:opacity-80"
          >
            {signingIn ? (
              <>
                <SpinningCompass size={5} className="text-primary" />
                {t('auth.signingIn')}
              </>
            ) : (
              <>
                <GoogleIcon />
                {t('auth.continueWithGoogle')}
              </>
            )}
          </Button>

          <ul className="mt-6 space-y-2">
            {trustPoints.map(({ icon: Icon, label }) => (
              <li key={label} className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-primary/10 text-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Icon className="h-3 w-3" strokeWidth={2.25} />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground/70 mt-6 text-center text-[11px] leading-relaxed">
            {t('auth.termsNotice')}
          </p>
        </div>
      </div>
    </div>
  );
}

type GreetingKey =
  | 'auth.greeting.morning'
  | 'auth.greeting.afternoon'
  | 'auth.greeting.evening'
  | 'auth.greeting.lateNight';

function getGreetingKey(): GreetingKey {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return 'auth.greeting.morning';
  if (h >= 12 && h < 17) return 'auth.greeting.afternoon';
  if (h >= 17 && h < 22) return 'auth.greeting.evening';
  return 'auth.greeting.lateNight';
}
