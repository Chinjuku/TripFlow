/**
 * Root application shell.
 *
 * Layout strategy:
 *   /login                  → no chrome, page renders full-screen
 *   /trips/[id]/*           → TripLayout via pages/trips/[id]/_layout.tsx
 *   everything else         → GlobalLayout (topbar only, no sidebar)
 */

import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/components/feat/auth/AuthProvider';
import { ProtectedRoute } from '@/components/feat/auth/ProtectedRoute';
import { ThemeProvider } from '@/components/feat/theme';
import { GlobalLayout } from '@/components/shared/GlobalLayout';

const PUBLIC_PATHS = ['/login'] as const;
const TRIP_DETAIL_PATTERN = '/trips/:id/*';

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p));
}

function isTripDetailPath(pathname: string): boolean {
  return matchPath(TRIP_DETAIL_PATTERN, pathname) !== null;
}

export default function App() {
  const { pathname } = useLocation();

  return (
    <ThemeProvider>
      <AuthProvider>
        {isPublicPath(pathname) ? (
          <Outlet />
        ) : (
          <ProtectedRoute>
            {isTripDetailPath(pathname) ? <Outlet /> : <GlobalLayout />}
          </ProtectedRoute>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}
