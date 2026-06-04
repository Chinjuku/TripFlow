import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { getGreetingKey } from '@/utils/auth';
import { GoogleIcon } from './GoogleIcon';
import { TermsModal } from './TermsModal';

export function AuthSignInPanel() {
  const { signingIn, signIn } = useGoogleSignIn();
  const { t } = useTranslation();
  const [termsOpen, setTermsOpen] = useState(false);

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

          <div className="mb-8 text-center">
            <h2 className="font-headline text-foreground mb-1.5 text-2xl font-bold tracking-tight">
              {t(getGreetingKey())}
            </h2>
            <p className="text-muted-foreground text-sm">{t('auth.signInToContinue')}</p>
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

          <p className="text-muted-foreground/70 mt-6 text-center text-[11px] leading-relaxed">
            <Trans
              i18nKey="auth.termsNotice"
              components={{
                1: (
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className="text-primary hover:text-primary/80 cursor-pointer font-medium underline underline-offset-2 transition-colors"
                  />
                ),
              }}
            />
          </p>
        </div>
      </div>

      <TermsModal open={termsOpen} onOpenChange={setTermsOpen} />
    </div>
  );
}
