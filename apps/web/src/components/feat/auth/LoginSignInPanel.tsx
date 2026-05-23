import { Lock, ShieldCheck } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { useGoogleSignIn } from '@/hooks/useGoogleSignIn';
import { getGreeting } from '@/utils/auth';
import { GoogleIcon } from './GoogleIcon';

const TRUST_POINTS = [
  { icon: Lock, label: 'Sign-in handled by Google · no password stored' },
  { icon: ShieldCheck, label: 'We never read your email or contacts' },
] as const;

export function LoginSignInPanel() {
  const { signingIn, signIn } = useGoogleSignIn();

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
              {getGreeting()}
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to continue planning your adventures
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
                Signing in…
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </Button>

          <ul className="mt-6 space-y-2">
            {TRUST_POINTS.map(({ icon: Icon, label }) => (
              <li key={label} className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-primary/10 text-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Icon className="h-3 w-3" strokeWidth={2.25} />
                </span>
                {label}
              </li>
            ))}
          </ul>

          <p className="text-muted-foreground/70 mt-6 text-center text-[11px] leading-relaxed">
            By signing in, you agree to our Terms of Service.
          </p>
        </div>
      </div>
    </div>
  );
}
