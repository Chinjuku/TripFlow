import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <AppShellSkeleton />;
  if (!isAuthenticated) {
    const target = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirectTo=${target}`} replace />;
  }

  return <>{children}</>;
}

function AppShellSkeleton() {
  return (
    <div className="bg-background flex min-h-screen overflow-hidden">
      <div className="border-border hidden w-64 flex-col space-y-6 border-r p-6 md:flex">
        <Skeleton className="h-8 w-32" />
        <div className="space-y-3 pt-8">
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
        <div className="border-border mt-auto flex items-center gap-3 border-t pt-4">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        </div>
      </div>
      <div className="flex-1 space-y-8 p-6 md:p-10">
        <div className="border-border mb-8 flex items-center justify-between border-b pb-4 md:hidden">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-32 w-full max-w-3xl rounded-xl" />
        <div className="grid max-w-3xl grid-cols-1 gap-6 sm:grid-cols-2">
          <Skeleton className="h-48 w-full rounded-xl" />
          <Skeleton className="h-48 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
