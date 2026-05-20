import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@trip-flow/api';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Eden Treaty client — E2E type-safe API client.
 *
 * Configured with `credentials: 'include'` so the browser automatically
 * attaches the httpOnly session cookie on every request.
 */
export const api = edenTreaty<App>(apiUrl, {
  $fetch: { credentials: 'include' },
});
