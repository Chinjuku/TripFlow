import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Lock, MapPin, ShieldCheck, Users, Zap } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { useAuth } from '@/features/auth/useAuth';
import { SpinningCompass } from '@/components/SpinningCompass';

/**
 * Returns a time-of-day greeting in the user's locale tz. Pure function so
 * it stays cheap to call inline — invoked once per render, no need to memo.
 *
 * Buckets are intentionally generous (4 not 6) so the copy doesn't feel
 * algorithmic; the late-night line is deliberately playful.
 */
function getGreeting(now: Date = new Date()): string {
  const h = now.getHours();
  if (h >= 5 && h < 12) return 'Good morning';
  if (h >= 12 && h < 17) return 'Good afternoon';
  if (h >= 17 && h < 22) return 'Good evening';
  return 'Late-night travel planning?';
}

export default function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();
  // Local "submitting" flag — we flip it on click and never flip back, since
  // a successful sign-in unmounts this page (Navigate fires once
  // `isAuthenticated` is true). If sign-in errors the page stays mounted
  // but the user can retry by reloading.
  const [signingIn, setSigningIn] = useState(false);

  function handleSignIn() {
    if (signingIn) return;
    setSigningIn(true);
    // signInWithGoogle triggers a full-page OAuth redirect — control leaves
    // this component before the next paint, so we don't need a finally to
    // flip the flag back. The compass spins until the redirect happens.
    try {
      signInWithGoogle();
    } catch (err) {
      console.error('[login] sign-in failed', err);
      setSigningIn(false);
    }
  }

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

  const greeting = getGreeting();

  return (
    <div className="bg-background text-foreground fixed inset-0 flex antialiased">
      {/* Left — Hero Panel (60%) */}
      <div className="relative hidden flex-col overflow-hidden lg:flex lg:w-[60%]">
        {/* Topographic contour pattern — replaces the dot-grid + ambient glow
            of the previous design. Concentric "elevation lines" evoke a
            paper atlas without using any gradient fills. */}
        <TopoPattern />

        {/* Corner coordinate labels — purely decorative, but they sell the
            "atlas" vibe and break up the otherwise empty corners. Numbers
            are Bangkok (top-left) + Chiang Mai (bottom-right) to suit the
            current user base. */}
        <span className="text-muted-foreground/40 absolute left-6 top-6 font-mono text-[10px] tracking-widest">
          13.7563° N · 100.5018° E
        </span>
        <span className="text-muted-foreground/40 absolute bottom-6 right-6 font-mono text-[10px] tracking-widest">
          18.7883° N · 98.9853° E
        </span>

        <div className="relative z-10 flex flex-1 flex-col justify-center px-14 py-12 xl:px-20">
          {/* Hero copy */}
          <div className="max-w-lg">
            {/* Brand mark, anchored above the headline. Replaces the former
                "Adventure Awaits" chip + top-left logo — keeping a single
                identity point keeps the eye flowing straight into the H1. */}
            <div className="mb-6 flex items-center gap-3">
              <div className="border-primary text-primary flex h-10 w-10 items-center justify-center rounded-full border-2">
                <SpinningCompass size={5} />
              </div>
              <span className="font-headline text-primary text-lg font-bold tracking-tight">
                TripFlow
              </span>
            </div>

            <h1 className="font-headline text-foreground mb-5 text-5xl font-extrabold leading-[1.08] tracking-tight xl:text-6xl">
              Plan your next
              <br />
              journey, <span className="text-primary">together.</span>
            </h1>

            <p className="text-muted-foreground mb-10 max-w-sm text-base leading-relaxed">
              Drag-and-drop itineraries, real-time collaboration, and smart reminders — all in one workspace.
            </p>

            {/* Numbered step flow — three columns connected by a dashed
                line that runs through the icon row. Reads as "do A → then B
                → then C" rather than as three independent feature blurbs. */}
            <ol className="relative grid grid-cols-3 gap-3">
              {/* Connector line behind the icon row. Top is calc'd to align
                  with the centre of the 10x10 icon discs (p-4 = 16px + h-10/2
                  = 20px → 36px from card top, then -translate-y-1/2). */}
              <div
                aria-hidden
                className="border-primary/25 absolute left-[16%] right-[16%] top-[2.25rem] border-t border-dashed"
              />
              {STEPS.map((step, idx) => (
                <li
                  key={step.title}
                  className="bg-card border-border relative flex flex-col items-center rounded-2xl border p-4 text-center"
                >
                  <div className="bg-card text-primary border-primary/40 relative z-10 mb-3 flex h-10 w-10 items-center justify-center rounded-full border-2">
                    <step.icon className="h-4 w-4" strokeWidth={2} />
                    <span className="bg-primary text-primary-foreground absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full text-[0.6rem] font-bold tabular-nums">
                      {idx + 1}
                    </span>
                  </div>
                  <p className="text-foreground text-sm font-semibold">{step.title}</p>
                  <p className="text-muted-foreground mt-0.5 truncate text-xs">
                    {step.desc}
                  </p>
                </li>
              ))}
            </ol>

            {/* Footer sits tight against the step row — a small `mt-3` keeps
                a hairline of breathing room without re-opening the visual
                gap that flex-justify-center used to create. */}
            <p className="text-muted-foreground/50 mt-3 text-xs">
              © {new Date().getFullYear()} TripFlow · Crafted for explorers
            </p>
          </div>
        </div>
      </div>

      {/* Right — Sign-in Panel (40%) */}
      <div className="lg:border-border relative flex flex-1 flex-col items-center justify-center px-6 lg:w-[40%] lg:flex-none lg:border-l lg:px-12 xl:px-16">
        <div className="relative z-10 w-full max-w-sm">
          <div className="bg-card border-border rounded-3xl border p-8 shadow-xl">
            {/* Logo inside card — mobile only */}
            <div className="mb-7 flex flex-col items-center gap-2 lg:hidden">
              <div className="border-primary text-primary flex h-12 w-12 items-center justify-center rounded-full border-2">
                <SpinningCompass size={6} />
              </div>
              <span className="font-headline text-primary text-xl font-bold tracking-tight">
                TripFlow
              </span>
            </div>

            {/* Heading — time-aware greeting personalises the page without
                requiring user data. Subtitle stays static so the call-to-
                action context is consistent. Centred on mobile (where the
                card stands alone) and left-aligned on lg+ where the hero
                panel sits to the left and a flush-left heading reads
                more naturally. */}
            <div className="mb-8 text-center lg:text-left">
              <h2 className="font-headline text-foreground mb-1.5 text-2xl font-bold tracking-tight">
                {greeting}
              </h2>
              <p className="text-muted-foreground text-sm">
                Sign in to continue planning your adventures
              </p>
            </div>

            {/* Google sign-in — swaps to the compass loader while the OAuth
                redirect is in flight. Disabled to prevent double-clicks. */}
            <Button
              id="google-sign-in-button"
              onClick={handleSignIn}
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

            {/* Trust chips — replace the "Secure login" divider with two
                explicit privacy promises. Stacks naturally on narrow card. */}
            <ul className="mt-6 space-y-2">
              <li className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-primary/10 text-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <Lock className="h-3 w-3" strokeWidth={2.25} />
                </span>
                Sign-in handled by Google · no password stored
              </li>
              <li className="text-muted-foreground flex items-center gap-2 text-xs">
                <span className="bg-primary/10 text-primary inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full">
                  <ShieldCheck className="h-3 w-3" strokeWidth={2.25} />
                </span>
                We never read your email or contacts
              </li>
            </ul>

            <p className="text-muted-foreground/70 mt-6 text-center text-[11px] leading-relaxed">
              By signing in, you agree to our Terms of Service.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Concentric SVG rings that read as topographic contour lines. The pattern
 * is offset to the left so the densest area sits behind the brand mark and
 * fades out toward the hero copy — keeping text legibility intact.
 *
 * Uses currentColor so the line weight follows `text-foreground/N` and
 * inherits theme switches automatically.
 */
function TopoPattern() {
  // Generate ~14 rings increasing by ~38px so the lines look hand-drawn,
  // not perfectly even.
  const rings = Array.from({ length: 14 }, (_, i) => 60 + i * 38);
  return (
    <svg
      aria-hidden
      viewBox="0 0 800 800"
      preserveAspectRatio="xMinYMin slice"
      className="text-foreground/[0.06] absolute inset-0 h-full w-full"
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        transform="translate(180 420)"
      >
        {rings.map((r) => (
          <circle key={r} cx={0} cy={0} r={r} />
        ))}
      </g>
      {/* Secondary, smaller cluster offset to the lower-right — looks like
          a neighbouring hill on the map. */}
      <g
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        transform="translate(680 720)"
      >
        {[40, 80, 120, 160, 200, 240, 280].map((r) => (
          <circle key={r} cx={0} cy={0} r={r} />
        ))}
      </g>
    </svg>
  );
}

/**
 * Three-step flow describing the actual user journey through the app —
 * favoured over a flat feature list because it doubles as onboarding:
 * a returning user sees the loop they already know, a new visitor learns
 * what they'll do once signed in.
 */
const STEPS = [
  {
    icon: MapPin,
    title: 'Add places',
    desc: 'Drop pins',
  },
  {
    icon: Users,
    title: 'Vote together',
    desc: 'Pick favourites',
  },
  {
    icon: Zap,
    title: 'Drag to plan',
    desc: 'Build the day',
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
