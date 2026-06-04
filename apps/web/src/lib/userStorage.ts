import type { AuthUser } from '@/types/auth';

const USER_STORAGE_KEY = 'tf_user';

/**
 * Cached auth user in localStorage. Lets the app paint an authenticated shell
 * immediately on reload instead of flashing the loading state while `/auth/me`
 * is in flight. Every access is guarded - storage can throw in private mode or
 * when disabled, and a stale/corrupt value must never crash the app.
 */
export const userStorage = {
  read(): AuthUser | null {
    try {
      const raw = localStorage.getItem(USER_STORAGE_KEY);
      return raw ? (JSON.parse(raw) as AuthUser) : null;
    } catch {
      return null;
    }
  },

  write(user: AuthUser): void {
    try {
      localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } catch {
      /* storage unavailable - cache is best-effort */
    }
  },

  clear(): void {
    try {
      localStorage.removeItem(USER_STORAGE_KEY);
    } catch {
      /* storage unavailable - nothing to clear */
    }
  },
};
