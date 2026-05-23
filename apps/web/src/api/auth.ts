import { API_URL } from '@/lib/config';
import type { AuthUser } from '@/types/auth';

export async function fetchCurrentUser(signal?: AbortSignal): Promise<AuthUser | null> {
  const res = await fetch(`${API_URL}/auth/me`, {
    credentials: 'include',
    signal,
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { user: AuthUser };
  return data.user;
}

export async function logout(): Promise<void> {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });
}

export function getGoogleSignInUrl(): string {
  return `${API_URL}/auth/google`;
}
