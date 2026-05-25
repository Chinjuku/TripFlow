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

const isProduction = env.nodeEnv === 'production';

/** Max-age for the session cookie (7 days in seconds). */
const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

/** Max-age for the PKCE cookie (10 minutes — just long enough for the OAuth round-trip). */
const PKCE_MAX_AGE = 60 * 10;

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
 * Builds attributes for the temporary PKCE verifier cookie.
 */
export function buildPkceCookie(verifier: string): CookieAttributes {
  return {
    value: verifier,
    httpOnly: true,
    secure: isProduction,
    sameSite: COOKIE_SAME_SITE,
    path: '/',
    maxAge: PKCE_MAX_AGE,
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
