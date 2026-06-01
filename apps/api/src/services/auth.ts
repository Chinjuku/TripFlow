/**
 * Auth service — Google OAuth (Authorization Code + PKCE) without Supabase.
 *
 * We talk to Google's OAuth 2.0 endpoints directly, decode the returned
 * id_token to get the user's profile, and upsert our own `users` row. The
 * caller's identity throughout the app is `users.id` — not Google's `sub`.
 *
 * HTTP-agnostic: plain inputs in, plain data out, domain errors on failure.
 */

import { db, users, type User } from '@trip-flow/db/server';
import { eq } from 'drizzle-orm';
import { decodeJwt } from 'jose';
import { generateCodeChallenge, generateCodeVerifier } from '../lib/pkce';
import { env } from '../env';
import { UnauthorizedError } from '../errors/domain';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_SCOPES = 'openid email profile';

/** Normalised user profile returned after successful authentication. */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

interface OAuthUrlResult {
  /** The full URL the browser should redirect to (Google consent screen). */
  url: string;
  /** PKCE code_verifier — the caller must persist it for the exchange step. */
  codeVerifier: string;
  /** Opaque anti-CSRF value — the caller must persist it and re-check it. */
  state: string;
}

/** Subset of the Google id_token claims we consume. */
interface GoogleIdToken {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

function toAuthUser(user: User): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatarUrl: user.avatar_url,
  };
}

/**
 * Builds the Google consent-screen URL with a PKCE challenge and a random
 * `state`. The caller persists `codeVerifier` + `state` (temp cookies) and
 * presents them back during {@link exchangeCodeForUser}.
 */
export async function getGoogleOAuthUrl(): Promise<OAuthUrlResult> {
  const codeVerifier = generateCodeVerifier();
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  const state = generateCodeVerifier(); // reuse the random-base64url generator

  const params = new URLSearchParams({
    client_id: env.googleClientId,
    redirect_uri: env.googleRedirectUri,
    response_type: 'code',
    scope: GOOGLE_SCOPES,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    state,
    access_type: 'offline',
    prompt: 'select_account',
  });

  return { url: `${GOOGLE_AUTH_URL}?${params.toString()}`, codeVerifier, state };
}

/**
 * Exchanges an OAuth authorization code + PKCE verifier for a user, upserting
 * the matching `users` row.
 *
 * @throws {UnauthorizedError} if the code exchange or token is invalid.
 */
export async function exchangeCodeForUser(code: string, codeVerifier: string): Promise<AuthUser> {
  const body = new URLSearchParams({
    code,
    client_id: env.googleClientId,
    client_secret: env.googleClientSecret,
    redirect_uri: env.googleRedirectUri,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier,
  });

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    const text = await response.text();
    console.error('[auth] google token exchange failed', response.status, text);
    throw new UnauthorizedError('Google sign-in failed — please try again');
  }

  const data = (await response.json()) as { id_token?: string };
  if (!data.id_token) {
    console.error('[auth] google token response missing id_token');
    throw new UnauthorizedError('Google sign-in failed — please try again');
  }

  // The id_token comes straight from Google's TLS-protected token endpoint,
  // so decoding (not verifying a signature) is sufficient here — we never
  // accept an id_token from an untrusted source.
  const claims = decodeJwt(data.id_token) as GoogleIdToken;
  if (!claims.sub) {
    throw new UnauthorizedError('Google sign-in failed — please try again');
  }

  return upsertGoogleUser(claims);
}

/**
 * Inserts a new user or updates an existing one keyed by Google `sub`.
 * Returns the canonical app-side profile.
 */
async function upsertGoogleUser(claims: GoogleIdToken): Promise<AuthUser> {
  const email = claims.email ?? '';
  const name = claims.name ?? 'Traveller';
  const avatarUrl = claims.picture ?? null;

  const [row] = await db
    .insert(users)
    .values({
      google_sub: claims.sub,
      email,
      name,
      avatar_url: avatarUrl,
    })
    .onConflictDoUpdate({
      target: users.google_sub,
      set: {
        email,
        name,
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString(),
      },
    })
    .returning();

  if (!row) throw new Error('User upsert returned no row');
  return toAuthUser(row);
}

/** Fetches a user by our internal id. Returns null if not found. */
export async function getUserById(userId: string): Promise<AuthUser | null> {
  const [row] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return row ? toAuthUser(row) : null;
}
