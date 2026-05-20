import { edenTreaty } from '@elysiajs/eden';
import type { App } from '@trip-flow/api';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = edenTreaty<App>(apiUrl);
