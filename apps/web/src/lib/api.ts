import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@trip-flow/api';
import { API_URL } from './config';

export const api = edenTreaty<App>(API_URL, {
  $fetch: { credentials: 'include' },
});
