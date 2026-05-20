/**
 * ProtectedRoute — route guard that redirects unauthenticated users to /login.
 *
 * Shows a loading spinner during the initial session check.
 * Renders children once authenticated.
 */

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from './useAuth';
import { Skeleton } from '@trip-flow/ui/components/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
      <div className="flex min-h-screen bg-slate-950 overflow-hidden">
        {/* Sidebar Skeleton (Desktop only) */}
        <div className="hidden md:flex w-64 flex-col border-r border-slate-900 p-6 space-y-6">
          <Skeleton className="h-8 w-32" />
          <div className="space-y-3 pt-8">
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
            <Skeleton className="h-11 w-full rounded-xl" />
          </div>
          <div className="mt-auto flex items-center gap-3 pt-4 border-t border-slate-900">
            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        </div>
        {/* Main Content Skeleton */}
        <div className="flex-1 p-6 md:p-10 space-y-8">
          {/* Mobile Header Skeleton */}
          <div className="md:hidden flex items-center justify-between border-b border-slate-900 pb-4 mb-8">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-32 w-full max-w-3xl rounded-xl" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl">
            <Skeleton className="h-48 w-full rounded-xl" />
            <Skeleton className="h-48 w-full rounded-xl" />
          </div>
        </div>
      </div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
