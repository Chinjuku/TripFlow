import { Elysia } from 'elysia';

export const healthRoute = new Elysia({ prefix: '/health' }).get('/', () => ({
  status: 'ok',
  uptime: process.uptime(),
  timestamp: new Date().toISOString(),
}));
