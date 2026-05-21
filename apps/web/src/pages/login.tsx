import { Navigate } from 'react-router-dom';
import { Compass, MapPin, Users, Zap } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { useAuth } from '@/features/auth/useAuth';

/**
 * Full-screen login page with Google OAuth.
 * Redirects authenticated users to /dashboard.
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <Compass className="text-primary h-10 w-10 animate-spin" strokeWidth={1.75} />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">
      {/* Left — Branding Panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden lg:flex lg:w-1/2">
        {/* Ambient emerald glow */}
        <div className="bg-primary/20 absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full blur-[120px]" />
        <div className="bg-tertiary/30 absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full blur-[120px]" />
        <div className="bg-primary/10 absolute left-1/3 top-1/2 h-[300px] w-[300px] rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-1 flex-col justify-center px-16">
          <BrandLogo />

          <h1 className="font-headline text-foreground mb-6 text-4xl font-extrabold leading-tight tracking-tight xl:text-5xl">
            Plan your next journey,{' '}
            <span className="text-primary">collaboratively.</span>
          </h1>

          <p className="text-muted-foreground mb-12 max-w-lg text-lg leading-relaxed">
            Drag-and-drop itineraries, real-time collaboration, and smart reminders — all in one
            beautifully crafted workspace.
          </p>

          <div className="grid max-w-md grid-cols-1 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="bg-card/60 border-border flex items-start gap-4 rounded-xl border p-4 backdrop-blur-sm"
              >
                <div className="bg-primary/10 text-primary flex h-10 w-10 shrink-0 items-center justify-center rounded-lg">
                  <feature.icon className="h-5 w-5" strokeWidth={1.75} />
                </div>
                <div>
                  <p className="text-foreground text-sm font-semibold">{feature.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-muted-foreground relative z-10 px-16 pb-8 text-xs">
          © {new Date().getFullYear()} TripFlow. Crafted for explorers.
        </div>
      </div>

      {/* Right — Sign-in Card */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 lg:px-16">
        {/* Mobile-only ambient glow */}
        <div className="bg-primary/15 absolute right-10 top-20 h-[300px] w-[300px] rounded-full blur-[100px] lg:hidden" />

        <div className="relative z-10 flex w-full max-w-sm flex-col items-center gap-8">
          {/* Mobile-only logo */}
          <div className="mb-4 lg:hidden">
            <BrandLogo compact />
          </div>

          <div className="space-y-2 text-center">
            <h2 className="font-headline text-foreground text-2xl font-bold tracking-tight">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm">
              Sign in to continue planning your trips
            </p>
          </div>

          <Button
            id="google-sign-in-button"
            onClick={signInWithGoogle}
            variant="outline"
            className="bg-card text-foreground hover:bg-muted h-12 w-full gap-3 rounded-xl font-medium shadow-sm transition-shadow hover:shadow-md"
          >
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="flex w-full items-center gap-3">
            <div className="bg-border h-px flex-1" />
            <span className="text-muted-foreground text-xs uppercase tracking-widest">Secure</span>
            <div className="bg-border h-px flex-1" />
          </div>

          <p className="text-muted-foreground max-w-xs text-center text-xs leading-relaxed">
            By signing in, you agree to our Terms of Service. Your data is encrypted and never
            shared.
          </p>
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: MapPin,
    title: 'Smart Itineraries',
    desc: 'Drag-and-drop boards with Google Maps integration',
  },
  {
    icon: Users,
    title: 'Real-time Collaboration',
    desc: 'Plan together with friends in live sync',
  },
  {
    icon: Zap,
    title: 'Automated Reminders',
    desc: 'Cron-powered notifications that keep trips on track',
  },
] as const;

function BrandLogo({ compact = false }: { compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-3' : 'mb-12 flex items-center gap-3'}>
      <div className="border-primary text-primary flex h-12 w-12 items-center justify-center rounded-full border-2">
        <Compass className="h-6 w-6" strokeWidth={2} />
      </div>
      <span className="font-headline text-primary text-2xl font-bold tracking-tight">
        TripFlow
      </span>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  );
}
