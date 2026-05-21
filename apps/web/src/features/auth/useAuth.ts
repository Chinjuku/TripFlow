/**
 * useAuth — convenience hook to access the auth context.
 *
 * Throws if used outside of AuthProvider to catch integration mistakes early.
 */

import { useContext } from 'react';
import { AuthContext } from './AuthProvider';
import type { AuthContextValue } from './types';

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error('useAuth must be used within an <AuthProvider>');
  }

  return context;
}
