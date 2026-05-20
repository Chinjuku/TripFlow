import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@trip-flow/ui/components/button';
import { Compass, MapPin, Users, Zap } from 'lucide-react';

/**
 * Full-screen login page with Google OAuth.
 *
 * If the user is already authenticated, redirects to /dashboard.
 */
export default function LoginPage() {
  const { isAuthenticated, isLoading, signInWithGoogle } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <Compass className="h-10 w-10 text-indigo-400 animate-spin" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="fixed inset-0 flex bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500 selection:text-white">
      {/* Left — Branding Panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between relative overflow-hidden">
        {/* Ambient gradient blobs */}
        <div className="absolute -top-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px]" />
        <div className="absolute -bottom-40 -right-20 h-[400px] w-[400px] rounded-full bg-purple-600/15 blur-[120px]" />
        <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full bg-pink-600/10 blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-center flex-1 px-16">
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Compass className="h-6 w-6 text-white" />
            </div>
            <span className="text-2xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              TripFlow
            </span>
          </div>

          <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight leading-tight text-white mb-6">
            Plan your next journey,{' '}
            <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
              collaboratively.
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed max-w-lg mb-12">
            Drag-and-drop itineraries, real-time collaboration, and smart reminders — all in one
            beautifully crafted workspace.
          </p>

          <div className="grid grid-cols-1 gap-4 max-w-md">
            {[
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
            ].map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-4 rounded-xl border border-slate-800/50 bg-slate-900/30 p-4 backdrop-blur-sm"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                  <feature.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-200">{feature.title}</p>
                  <p className="text-xs text-slate-500 leading-relaxed">{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 px-16 pb-8">
          <p className="text-xs text-slate-600">
            © {new Date().getFullYear()} TripFlow. Crafted for explorers.
          </p>
        </div>
      </div>

      {/* Right — Sign-in Card */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 lg:px-16 relative">
        {/* Mobile-only ambient glow */}
        <div className="absolute top-20 right-10 h-[300px] w-[300px] rounded-full bg-indigo-600/10 blur-[100px] lg:hidden" />

        <div className="relative z-10 w-full max-w-sm flex flex-col items-center gap-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 lg:hidden mb-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/25">
              <Compass className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-wider bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              TripFlow
            </span>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-white tracking-tight">Welcome back</h2>
            <p className="text-sm text-slate-500">Sign in to continue planning your trips</p>
          </div>

          <div className="w-full space-y-4">
            <Button
              id="google-sign-in-button"
              onClick={signInWithGoogle}
              className="w-full h-12 bg-white hover:bg-slate-100 text-slate-900 rounded-xl font-medium gap-3 transition-all shadow-lg shadow-white/5 hover:shadow-white/10"
            >
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
              Continue with Google
            </Button>
          </div>

          <div className="flex items-center gap-3 w-full">
            <div className="flex-1 h-px bg-slate-800" />
            <span className="text-xs text-slate-600 uppercase tracking-widest">Secure</span>
            <div className="flex-1 h-px bg-slate-800" />
          </div>

          <p className="text-xs text-slate-600 text-center leading-relaxed max-w-xs">
            By signing in, you agree to our Terms of Service. Your data is encrypted and never
            shared.
          </p>
        </div>
      </div>
    </div>
  );
}
