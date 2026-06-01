/**
 * Auth routes — declarative HTTP routing for authentication.
 *
 * Maps HTTP methods and paths to controller handlers. Route handlers
 * contain zero business logic — they strictly delegate to controllers.
 */

import { Elysia, t } from 'elysia';
import {
  handleGoogleRedirect,
  handleCallback,
  handleGetMe,
  handleLogout,
} from '../controllers/auth';

export const authRoute = new Elysia({ prefix: '/auth' })
  /**
   * Initiates Google OAuth flow.
   * Redirects the browser to Google's consent screen.
   */
  .get('/google', handleGoogleRedirect)

  /**
   * OAuth callback endpoint.
   * Receives the authorization code from Supabase/Google.
   */
  .get('/callback', handleCallback, {
    query: t.Object({
      code: t.Optional(t.String()),
      state: t.Optional(t.String()),
      error: t.Optional(t.String()),
    }),
  })

  /**
   * Returns the currently authenticated user.
   */
  .get('/me', handleGetMe)

  /**
   * Signs out the current user by clearing the session cookie.
   */
  .post('/logout', handleLogout);
