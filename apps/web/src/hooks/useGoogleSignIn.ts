import { useCallback, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface UseGoogleSignIn {
  signingIn: boolean;
  signIn: () => void;
}

export function useGoogleSignIn(): UseGoogleSignIn {
  const { signInWithGoogle } = useAuth();
  const [signingIn, setSigningIn] = useState(false);

  const signIn = useCallback(() => {
    if (signingIn) return;
    setSigningIn(true);
    try {
      signInWithGoogle();
    } catch (err) {
      console.error('[auth] google sign-in failed', err);
      setSigningIn(false);
    }
  }, [signingIn, signInWithGoogle]);

  return { signingIn, signIn };
}
