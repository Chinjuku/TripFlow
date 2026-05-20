/**
 * JWT signing and verification using the `jose` library.
 *
 * We issue our own JWTs (independent of Supabase's tokens) so that the
 * frontend is fully decoupled from Supabase. The JWT secret is loaded
 * from the environment at module initialisation.
 */

import { SignJWT, jwtVerify, errors as joseErrors } from 'jose';
import { env } from '../env';
import { UnauthorizedError } from '../errors/domain';

/** Encode the secret once at module level. */
const SECRET = new TextEncoder().encode(env.jwtSecret);

const ISSUER = 'trip-flow-api';
const ALGORITHM = 'HS256';

/** Default token lifetime: 7 days (in seconds). */
const DEFAULT_EXPIRY = '7d';

/**
 * Claims embedded in every TripFlow JWT.
 */
export interface JwtPayload {
  /** Supabase user ID (auth.users.id). */
  sub: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

/**
 * Signs a new JWT with the given user claims.
 */
export async function signToken(payload: JwtPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: ALGORITHM })
    .setIssuer(ISSUER)
    .setIssuedAt()
    .setExpirationTime(DEFAULT_EXPIRY)
    .sign(SECRET);
}

/**
 * Verifies a JWT and returns the decoded payload.
 *
 * @throws {UnauthorizedError} if the token is expired, malformed, or invalid.
 */
export async function verifyToken(token: string): Promise<JwtPayload> {
  try {
    const { payload } = await jwtVerify(token, SECRET, {
      issuer: ISSUER,
      algorithms: [ALGORITHM],
    });

    return {
      sub: payload.sub as string,
      email: payload.email as string,
      name: payload.name as string,
      avatarUrl: (payload.avatarUrl as string | null) ?? null,
    };
  } catch (error) {
    if (error instanceof joseErrors.JWTExpired) {
      throw new UnauthorizedError('Session expired — please sign in again');
    }
    throw new UnauthorizedError('Invalid session token');
  }
}
