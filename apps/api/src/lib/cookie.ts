/**
 * Cookie configuration helpers.
 *
 * Centralises cookie names, attributes, and builder functions so that
 * auth-related cookies are configured consistently across the codebase.
 */

import { env } from '../env';

/** Name of the long-lived session cookie carrying the signed JWT. */
export const SESSION_COOKIE = 'tf_session' as const;

/** Name of the short-lived cookie storing the PKCE code_verifier during OAuth. */
export const PKCE_COOKIE = 'tf_pkce_verifier' as const;

/** Name of the short-lived cookie storing the OAuth anti-CSRF `state` value. */
export const STATE_COOKIE = 'tf_oauth_state' as const;

/**
 * Name of the short-lived cookie carrying the post-login destination path.
 * The Google redirect_uri is fixed, so we stash where the user was heading
 * here instead of round-tripping it through the callback URL.
 */
export const REDIRECT_COOKIE = 'tf_oauth_redirect' as const;

const isProduction = env.nodeEnv === 'production';

/** Max-age for the session cookie (7 days in seconds). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Max-age for the short-lived OAuth cookies (10 min — just enough for the round-trip). */
const OAUTH_TEMP_MAX_AGE = 60 * 10;

export interface CookieAttributes {
  value: string;
  httpOnly: boolean;
  secure: boolean;
  sameSite: 'lax' | 'strict' | 'none';
  path: string;
  maxAge: number;
  domain?: string;
}

const COOKIE_DOMAIN = isProduction ? '.chinniejeen.com' : undefined;
const COOKIE_SAME_SITE: CookieAttributes['sameSite'] = isProduction ? 'none' : 'lax';

/**
 * Builds attributes for the session cookie.
 */
export function buildSessionCookie(token: string): CookieAttributes {
  return {
    value: token,
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: SESSION_MAX_AGE,
    domain: COOKIE_DOMAIN,
  };
}

/**
 * Builds attributes for a short-lived OAuth helper cookie (PKCE verifier or
 * `state`). Both carry an opaque value that only needs to survive the consent
 * round-trip, so they share one builder.
 */
export function buildOAuthTempCookie(value: string): CookieAttributes {
  return {
    value,
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: OAUTH_TEMP_MAX_AGE,
    domain: COOKIE_DOMAIN,
  };
}

/**
 * Builds attributes that instruct the browser to delete a cookie.
 */
export function buildClearCookie(): CookieAttributes {
  return {
    value: '',
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: 0,
    domain: COOKIE_DOMAIN,
  };
}
