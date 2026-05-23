/**
 * AuthProvider — manages session state via the Elysia API.
 *
 * On mount, calls GET /auth/me to check for an existing session cookie.
 * Provides user state and auth actions to the entire component tree.
 */

import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import type { AuthUser, AuthContextValue } from '@/types/auth';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /**
   * Check existing session on mount.
   * Uses raw fetch (not Eden) because this runs before the app is fully
   * hydrated and we need minimal overhead.
   */
  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch(`${API_URL}/auth/me`, {
          credentials: 'include',
        });

        if (res.ok) {
          const data = (await res.json()) as { user: AuthUser };
          if (!cancelled) setUser(data.user);
        }
      } catch {
        // Network error or 401 — user is not authenticated
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void checkSession();

    return () => {
      cancelled = true;
    };
  }, []);

  const signInWithGoogle = useCallback(() => {
    window.location.href = `${API_URL}/auth/google`;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        credentials: 'include',
      });
    } finally {
      setUser(null);
      window.location.href = '/login';
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated: user !== null,
      signInWithGoogle,
      signOut,
    }),
    [user, isLoading, signInWithGoogle, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
