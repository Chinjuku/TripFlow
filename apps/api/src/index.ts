import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { reminderCron } from './cron/reminders';
import { env } from './env';
import { healthRoute } from './routes/health';

export const app = new Elysia()
  .use(cors())
  .onError(({ code, error, set }) => {
    if (code === 'VALIDATION') {
      set.status = 400;
      return { error: 'ValidationError', detail: error.message };
    }
    set.status = 500;
    console.error('[api] unhandled error', error);
    return { error: 'InternalServerError' };
  })
  .use(healthRoute)
  .use(reminderCron)
  .listen(env.port);

console.info(
  `[api] TripFlow API listening on http://${app.server?.hostname}:${app.server?.port}`,
);

export type App = typeof app;
