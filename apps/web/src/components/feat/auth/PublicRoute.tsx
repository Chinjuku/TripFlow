import React from 'react';
import { Navigate } from 'react-router-dom';
import { SpinningCompass } from '@/components/ui/SpinningCompass';
import { useAuth } from '@/hooks/useAuth';

interface PublicRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
}

export function PublicRoute({ children, redirectTo = '/trips' }: PublicRouteProps) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="bg-background fixed inset-0 flex items-center justify-center">
        <SpinningCompass size={10} className="text-primary" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  return <>{children}</>;
}
