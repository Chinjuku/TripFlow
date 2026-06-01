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
  STATE_COOKIE,
  REDIRECT_COOKIE,
  buildSessionCookie,
  buildOAuthTempCookie,
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

/** Restrict post-login redirects to in-app paths so `state`/cookies can't be
 *  used as an open redirect to an attacker's site. */
function safeRedirectPath(raw: string | undefined): string | null {
  if (!raw) return null;
  // Only same-origin absolute paths: must start with a single "/".
  return raw.startsWith('/') && !raw.startsWith('//') ? raw : null;
}

/**
 * GET /auth/google
 *
 * Generates a Google OAuth URL with PKCE + anti-CSRF state, stashes the
 * verifier, state, and intended destination in short-lived cookies, then
 * redirects the browser to Google's consent screen.
 */
export async function handleGoogleRedirect({
  cookie,
  redirect,
  request,
}: Context): Promise<unknown> {
  const redirectTo = safeRedirectPath(
    new URL(request.url).searchParams.get('redirectTo') ?? undefined,
  );

  const { url, codeVerifier, state } = await authService.getGoogleOAuthUrl();

  setCookie(cookie, PKCE_COOKIE, buildOAuthTempCookie(codeVerifier));
  setCookie(cookie, STATE_COOKIE, buildOAuthTempCookie(state));
  if (redirectTo) setCookie(cookie, REDIRECT_COOKIE, buildOAuthTempCookie(redirectTo));

  return redirect(url);
}

/**
 * GET /auth/callback
 *
 * Handles Google's OAuth callback:
 * 1. Verifies `state` matches the cookie (CSRF guard)
 * 2. Exchanges the auth code + PKCE verifier for the user (upserts our row)
 * 3. Signs our own JWT and sets it as the session cookie
 * 4. Clears the temp OAuth cookies
 * 5. Redirects to the stashed destination (or the trips list)
 */
export async function handleCallback({ query, cookie, redirect }: Context): Promise<unknown> {
  const code = query['code'] as string | undefined;
  const returnedState = query['state'] as string | undefined;
  const codeVerifier = cookie[PKCE_COOKIE]?.value as string | undefined;
  const expectedState = cookie[STATE_COOKIE]?.value as string | undefined;
  const redirectTo = safeRedirectPath(cookie[REDIRECT_COOKIE]?.value as string | undefined);

  // Always clear the temp cookies, whatever the outcome.
  setCookie(cookie, PKCE_COOKIE, buildClearCookie());
  setCookie(cookie, STATE_COOKIE, buildClearCookie());
  setCookie(cookie, REDIRECT_COOKIE, buildClearCookie());

  const fail = (reason: string) => {
    const params = new URLSearchParams({ error: reason });
    if (redirectTo) params.set('redirectTo', redirectTo);
    return redirect(`${env.webUrl}/auth?${params.toString()}`);
  };

  if (!code || !codeVerifier) return fail('missing_code');
  if (!returnedState || !expectedState || returnedState !== expectedState) {
    return fail('state_mismatch');
  }

  const user = await authService.exchangeCodeForUser(code, codeVerifier);

  const token = await signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatarUrl,
  });

  setCookie(cookie, SESSION_COOKIE, buildSessionCookie(token));

  return redirect(`${env.webUrl}${redirectTo ?? '/trips'}`);
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
