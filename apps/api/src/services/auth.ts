/**
 * Auth service — core business logic for Google OAuth via Supabase.
 *
 * This module is HTTP-agnostic: it receives and returns plain TypeScript
 * data. It never imports Elysia's Context or touches request/response
 * objects directly.
 */

import { supabase } from '../lib/supabase';
import { generateCodeVerifier, generateCodeChallenge } from '../lib/pkce';
import { env } from '../env';
import { UnauthorizedError } from '../errors/domain';

/**
 * Normalised user profile returned after successful authentication.
 */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface OAuthUrlResult {
  /** The full URL the browser should redirect to (Google consent screen). */
  url: string;
  /** The PKCE code_verifier that must be stored and sent back during exchange. */
  codeVerifier: string;
}

/**
 * Generates the Google OAuth URL with PKCE challenge.
 *
 * The caller must persist `codeVerifier` (e.g. in a temporary cookie)
 * and present it during `exchangeCodeForUser`.
 */
export async function getGoogleOAuthUrl(redirectTo: string): Promise<OAuthUrlResult> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        code_challenge: codeChallenge,
        code_challenge_method: 's256',
      },
      skipBrowserRedirect: true,
    },
  });

  if (error || !data.url) {
    console.error('[auth] failed to generate OAuth URL', error);
    throw new UnauthorizedError('Unable to initiate Google sign-in');
  }

  return { url: data.url, codeVerifier };
}

/**
 * Exchanges an OAuth authorization code + PKCE verifier for a user session.
 *
 * Uses the Supabase Auth REST API directly because the JS client's
 * `exchangeCodeForSession` reads the code_verifier from its internal
 * storage, which is not available in a stateless server context.
 *
 * @throws {UnauthorizedError} if the code exchange fails.
 */
export async function exchangeCodeForUser(code: string, codeVerifier: string): Promise<AuthUser> {
  const response = await fetch(`${env.supabaseUrl}/auth/v1/token?grant_type=pkce`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: env.supabaseServiceRoleKey,
    },
    body: JSON.stringify({
      auth_code: code,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    console.error('[auth] code exchange failed', response.status, body);
    throw new UnauthorizedError('Google sign-in failed — please try again');
  }

  const data = (await response.json()) as {
    access_token: string;
    user: {
      id: string;
      email?: string;
      user_metadata?: Record<string, unknown>;
    };
  };

  const { user } = data;
  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? (meta.email as string) ?? '',
    name: (meta.full_name as string) ?? (meta.name as string) ?? 'Traveller',
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  };
}

/**
 * Fetches a user by ID from Supabase auth (admin endpoint).
 *
 * Used to rehydrate user data when the JWT contains only essential claims.
 */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  const { data, error } = await supabase.auth.admin.getUserById(userId);

  if (error || !data.user) {
    return null;
  }

  const { user } = data;
  const meta = user.user_metadata ?? {};

  return {
    id: user.id,
    email: user.email ?? (meta.email as string) ?? '',
    name: (meta.full_name as string) ?? (meta.name as string) ?? 'Traveller',
    avatarUrl: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  };
}
