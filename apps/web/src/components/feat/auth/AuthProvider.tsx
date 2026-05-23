import React, { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import { fetchCurrentUser, getGoogleSignInUrl, logout } from '@/api/auth';
import type { AuthContextValue, AuthUser } from '@/types/auth';

export const AuthContext = createContext<AuthContextValue | null>(null);

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    fetchCurrentUser(controller.signal)
      .then((next) => setUser(next))
      .catch(() => {})
      .finally(() => setIsLoading(false));

    return () => controller.abort();
  }, []);

  const signInWithGoogle = useCallback(() => {
    window.location.href = getGoogleSignInUrl();
  }, []);

  const signOut = useCallback(async () => {
    try {
      await logout();
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
