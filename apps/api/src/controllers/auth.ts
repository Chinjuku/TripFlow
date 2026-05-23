/**
 * Auth controller — HTTP request/response adapter.
 *
 * Extracts HTTP concerns (cookies, query params, redirects, status codes)
 * and delegates all business logic to the auth service. Controllers never
 * call the database directly.
 */

import type { Context } from 'elysia';
import { env } from '../env';
import { signToken, verifyToken } from '../lib/jwt';
import {
  SESSION_COOKIE,
  PKCE_COOKIE,
  buildSessionCookie,
  buildPkceCookie,
  buildClearCookie,
} from '../lib/cookie';
import * as authService from '../services/auth';

/**
 * Helper to set a cookie with our CookieAttributes shape.
 */
function setCookie(
  cookie: Context['cookie'],
  name: string,
  attrs: ReturnType<typeof buildSessionCookie>,
): void {
  cookie[name]!.set({
    value: attrs.value,
    httpOnly: attrs.httpOnly,
    secure: attrs.secure,
    sameSite: attrs.sameSite,
    path: attrs.path,
    maxAge: attrs.maxAge,
  });
}

/**
 * GET /auth/google
 *
 * Generates a Google OAuth URL, stores the PKCE verifier in a temp cookie,
 * and redirects the browser to Google's consent screen.
 */
export async function handleGoogleRedirect({
  cookie,
  redirect,
  request,
}: Context): Promise<unknown> {
  const urlObj = new URL(request.url);
  const redirectTo = urlObj.searchParams.get('redirectTo');

  const origin = urlObj.origin;
  const callbackUrl = redirectTo
    ? `${origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`
    : `${origin}/auth/callback`;
  const { url, codeVerifier } = await authService.getGoogleOAuthUrl(callbackUrl);

  setCookie(cookie, PKCE_COOKIE, buildPkceCookie(codeVerifier));
  return redirect(url);
}

/**
 * GET /auth/callback
 *
 * Handles the OAuth callback from Supabase:
 * 1. Reads the auth code from query params
 * 2. Reads the PKCE verifier from the temp cookie
 * 3. Exchanges both for a Supabase session
 * 4. Signs our own JWT and sets it as a session cookie
 * 5. Clears the PKCE cookie
 * 6. Redirects the browser to the frontend trips list (or custom redirectTo path)
 */
export async function handleCallback({ query, cookie, redirect }: Context): Promise<unknown> {
  const code = query['code'] as string | undefined;
  const codeVerifier = cookie[PKCE_COOKIE]?.value as string | undefined;
  const redirectTo = query['redirectTo'] as string | undefined;

  if (!code || !codeVerifier) {
    const loginUrl = redirectTo
      ? `${env.webUrl}/login?error=missing_code&redirectTo=${encodeURIComponent(redirectTo)}`
      : `${env.webUrl}/login?error=missing_code`;
    return redirect(loginUrl);
  }

  const user = await authService.exchangeCodeForUser(code, codeVerifier);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });

  setCookie(cookie, SESSION_COOKIE, buildSessionCookie(token));
  setCookie(cookie, PKCE_COOKIE, buildClearCookie());

  const targetUrl = redirectTo ? `${env.webUrl}${redirectTo}` : `${env.webUrl}/trips`;
  return redirect(targetUrl);
}

/**
 * GET /auth/me
 *
 * Returns the authenticated user's profile from the JWT claims.
 * Returns 401 if the session cookie is missing or invalid.
 */
export async function handleGetMe({ cookie, set }: Context): Promise<unknown> {
  const token = cookie[SESSION_COOKIE]?.value as string | undefined;

  if (!token) {
    set.status = 401;
    return { error: 'UNAUTHORIZED', message: 'No active session' };
  }

  const payload = await verifyToken(token);

  return {
    user: {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      avatarUrl: payload.avatarUrl,
    },
  };
}

/**
 * POST /auth/logout
 *
 * Clears the session cookie.
 */
export async function handleLogout({ cookie }: Context): Promise<unknown> {
  setCookie(cookie, SESSION_COOKIE, buildClearCookie());
  return { message: 'Signed out' };
}
