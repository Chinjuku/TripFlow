import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, getGoogleSignInUrl, logout } from '@/api/auth';
import { userStorage } from '@/lib/userStorage';
import type { AuthContextValue, AuthUser } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(() => userStorage.read());
  const [isLoading, setIsLoading] = useState(() => userStorage.read() === null);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((next) => {
        if (controller.signal.aborted) return;
        setUser(next);
        if (next) {
          userStorage.write(next);
        } else {
          userStorage.clear();
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        userStorage.clear();
      })
      .finally(() => {
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, []);

  const signInWithGoogle = useCallback(() => {
    const redirectTo = new URLSearchParams(window.location.search).get('redirectTo');
    const baseUrl = getGoogleSignInUrl();
    window.location.href = redirectTo
      ? `${baseUrl}?redirectTo=${encodeURIComponent(redirectTo)}`
      : baseUrl;
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
    } finally {
      setUser(null);
      userStorage.clear();
      window.location.href = '/auth';
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
