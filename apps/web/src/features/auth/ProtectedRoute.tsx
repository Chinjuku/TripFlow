/**
 * ProtectedRoute — route guard that redirects unauthenticated users to /login.
 *
 * Shows a loading spinner during the initial session check.
 * Renders children once authenticated.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Compass } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-slate-950 gap-4">
        <div className="relative flex items-center justify-center h-16 w-16">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 blur-xl animate-pulse" />
          <Compass className="h-10 w-10 text-indigo-400 animate-spin" />
        </div>
        <p className="text-sm text-slate-500 animate-pulse">Loading your journey…</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
