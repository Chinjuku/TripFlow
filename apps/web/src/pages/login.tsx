import { Navigate } from 'react-router-dom';
import { MapPin, Users, Zap, Globe } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { useAuth } from '@/features/auth/useAuth';
import { SpinningCompass } from '@/components/SpinningCompass';

export default function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <SpinningCompass size={10} className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/trips" replace />;
  }

  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">

      {/* Left — Hero Panel (60%) */}
      <div className="relative hidden flex-col lg:flex lg:w-[60%]">

        {/* Ambient glows using design tokens */}
        <div className="bg-primary/15 absolute -left-32 -top-32 h-[600px] w-[600px] rounded-full blur-[140px]" />
        <div className="bg-primary/8 absolute bottom-0 left-1/4 h-[500px] w-[500px] rounded-full blur-[120px]" />

        {/* Dot-grid */}
        <div
          aria-hidden
          className="text-foreground/5 absolute inset-0"
          style={{
            backgroundImage: 'radial-gradient(circle, currentColor 1px, transparent 1px)',
            backgroundSize: '28px 28px',
          }}
        />

        <div className="relative z-10 flex flex-1 flex-col justify-between px-14 py-12 xl:px-20">

          {/* Brand */}
          <div className="flex items-center gap-3">
            <div className="border-primary text-primary flex h-10 w-10 items-center justify-center rounded-full border-2">
              <SpinningCompass size={5} />
            </div>
            <span className="font-headline text-primary text-lg font-bold tracking-tight">
              TripFlow
            </span>
          </div>

          {/* Hero copy */}
          <div className="max-w-lg">
            <div className="border-primary/30 bg-primary/10 text-primary mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1">
              <Globe className="h-3 w-3" strokeWidth={2} />
              <span className="text-[11px] font-semibold uppercase tracking-widest">
                Adventure Awaits
              </span>
            </div>

            <h1 className="font-headline text-foreground mb-5 text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
              Plan your next
              <br />
              journey,{' '}
              <span className="text-primary">together.</span>
            </h1>

            <p className="text-muted-foreground mb-10 max-w-sm text-base leading-relaxed">
              Drag-and-drop itineraries, real-time collaboration, and smart reminders — all in one workspace.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-3 gap-3">
              {FEATURES.map((feature) => (
                <div
                  key={feature.title}
                  className="bg-card border-border rounded-2xl border p-4"
                >
                  <div className="bg-primary/10 text-primary mb-3 flex h-8 w-8 items-center justify-center rounded-lg">
                    <feature.icon className="h-4 w-4" strokeWidth={1.75} />
                  </div>
                  <p className="text-foreground text-sm font-semibold">{feature.title}</p>
                  <p className="text-muted-foreground mt-0.5 text-xs leading-relaxed">{feature.desc}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <p className="text-muted-foreground/50 text-xs">
            © {new Date().getFullYear()} TripFlow · Crafted for explorers
          </p>
        </div>
      </div>

      {/* Right — Sign-in Panel (40%) */}
      <div className="relative flex flex-1 flex-col items-center justify-center px-6 lg:w-[40%] lg:flex-none lg:border-l lg:border-border lg:px-12 xl:px-16">

        <div className="relative z-10 w-full max-w-sm">

          <div className="bg-card border-border rounded-3xl border p-8 shadow-xl">

            {/* Logo inside card — mobile only */}
            <div className="mb-7 flex flex-col items-center gap-2 lg:hidden">
              <div className="border-primary text-primary flex h-12 w-12 items-center justify-center rounded-full border-2">
                <SpinningCompass size={6} />
              </div>
              <span className="font-headline text-primary text-xl font-bold tracking-tight">TripFlow</span>
            </div>

            {/* Heading */}
            <div className="mb-8">
              <h2 className="font-headline text-foreground mb-1.5 text-2xl font-bold tracking-tight">
                Welcome back
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to continue planning your adventures
              </p>
            </div>

            {/* Google sign-in */}
            <Button
              id="google-sign-in-button"
              onClick={signInWithGoogle}
              variant="outline"
              className="text-foreground hover:text-foreground hover:bg-muted h-12 w-full cursor-pointer gap-3 rounded-xl font-medium transition-all duration-200 hover:shadow-md"
            >
              <GoogleIcon />
              Continue with Google
            </Button>

            <div className="mt-6 flex items-center gap-3">
              <div className="bg-border h-px flex-1" />
              <span className="text-muted-foreground text-[11px] uppercase tracking-widest">Secure login</span>
              <div className="bg-border h-px flex-1" />
            </div>

            <p className="text-muted-foreground mt-6 text-center text-xs leading-relaxed">
              By signing in, you agree to our Terms of Service.
              <br />
              Your data is encrypted and never shared.
            </p>
          </div>
        </div>
      </div>

    </div>
  );
}

const FEATURES = [
  {
    icon: MapPin,
    title: 'Smart Itineraries',
    desc: 'Drag-and-drop with Maps',
  },
  {
    icon: Users,
    title: 'Live Collaboration',
    desc: 'Plan together in real-time',
  },
  {
    icon: Zap,
    title: 'Auto Reminders',
    desc: 'Smart notifications',
  },
] as const;

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
