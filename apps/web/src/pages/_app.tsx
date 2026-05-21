/**
 * Root application shell.
 *
 * Wraps the entire app with AuthProvider. The Outlet renders either:
 * - Public pages (e.g. /login) that handle their own auth checks
 * - Protected pages wrapped by ProtectedRoute in the route tree
 *
 * Layout is handled by MainLayout for authenticated routes,
 * while /login renders its own full-screen layout.
 */

import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/features/auth/AuthProvider';
import { ProtectedRoute } from '@/features/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';

const PUBLIC_PATHS = ['/login'] as const;

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

export default function App() {
  const { pathname } = useLocation();

  return (
    <AuthProvider>
      {isPublicPath(pathname) ? (
        <Outlet />
      ) : (
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      )}
    </AuthProvider>
  );
}
