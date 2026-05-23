import React from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { useAuth } from '@/hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicRoute({ children, redirectTo = '/trips' }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [searchParams] = useSearchParams();

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <SpinningCompass size={10} className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    const target = searchParams.get('redirectTo') || redirectTo;
    return <Navigate to={target} replace />;
  }

  return <>{children}</>;
}
