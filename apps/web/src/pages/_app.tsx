/**
 * Root application shell.
 *
 * Layout strategy:
 *   /auth                   → no chrome, page renders full-screen
 *   /trips/[id]/*           → WorkspaceLayout via pages/trips/[id]/_layout.tsx
 *   everything else         → GlobalLayout (topbar only, no sidebar)
 */

import { Outlet, matchPath, useLocation } from 'react-router-dom';
import { AuthProvider, ProtectedRoute, PublicRoute } from '@/components/feat/auth';
import { ThemeProvider } from '@/components/shared/theme/ThemeProvider';
import { GlobalLayout } from '@/components/shared/layout/GlobalLayout';

const PUBLIC_PATHS = ['/auth'] as const;
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
          <PublicRoute>
            <Outlet />
          </PublicRoute>
        ) : (
          <ProtectedRoute>
            {isTripDetailPath(pathname) ? <Outlet /> : <GlobalLayout />}
          </ProtectedRoute>
        )}
      </AuthProvider>
    </ThemeProvider>
  );
}
