import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, getGoogleSignInUrl, logout } from '@/api/auth';
import type { AuthContextValue, AuthUser } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const cached = localStorage.getItem('tf_user');
      return cached ? JSON.parse(cached) : null;
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(() => {
    try {
      return !localStorage.getItem('tf_user');
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((next) => {
        if (!controller.signal.aborted) {
          setUser(next);
          if (next) {
            try {
              localStorage.setItem('tf_user', JSON.stringify(next));
            } catch {}
          } else {
            try {
              localStorage.removeItem('tf_user');
            } catch {}
          }
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        try {
          localStorage.removeItem('tf_user');
        } catch {}
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, []);

  const signInWithGoogle = useCallback(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const redirectTo = searchParams.get('redirectTo');
    const baseUrl = getGoogleSignInUrl();
    const url = redirectTo
      ? `${baseUrl}?redirectTo=${encodeURIComponent(redirectTo)}`
      : baseUrl;
    window.location.href = url;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      try {
        localStorage.removeItem('tf_user');
      } catch {}
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
