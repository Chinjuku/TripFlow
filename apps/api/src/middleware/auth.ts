/**
 * Auth middleware — reusable Elysia derive plugin.
 *
 * Reads the session cookie, verifies the JWT, and derives `ctx.user`
 * for downstream handlers. Use this on any route group that requires
 * authentication.
 *
 * Usage:
 *   .use(requireAuth)
 *   .get('/protected', ({ user }) => user)
 */

import { Elysia } from 'elysia';
import { verifyToken } from '../lib/jwt';
import { SESSION_COOKIE } from '../lib/cookie';
import { UnauthorizedError } from '../errors/domain';

export const requireAuth = new Elysia({ name: 'middleware/auth' }).derive(
  { as: 'global' },
  async ({ cookie }) => {
    const token = cookie[SESSION_COOKIE]?.value as string | undefined;

    if (!token) {
      throw new UnauthorizedError('Authentication required');
    }

    const user = await verifyToken(token);
    return { user };
  },
);
