import { cors } from '@elysiajs/cors';
import { Elysia } from 'elysia';
import { reminderCron } from './cron/reminders';
import { env } from './env';
import { DomainError, UnauthorizedError, ForbiddenError, NotFoundError } from './errors/domain';
import { healthRoute } from './routes/health';
import { authRoute } from './routes/auth';

export const app = new Elysia()
  .use(
    cors({
      origin: env.webUrl,
      credentials: true,
    }),
  )
  .onError(({ error, set }) => {
    // Map domain errors to HTTP status codes
    if (error instanceof UnauthorizedError) {
      set.status = 401;
      return { error: error.code, message: error.message };
    }
    if (error instanceof ForbiddenError) {
      set.status = 403;
      return { error: error.code, message: error.message };
    }
    if (error instanceof NotFoundError) {
      set.status = 404;
      return { error: error.code, message: error.message };
    }
    if (error instanceof DomainError) {
      set.status = 400;
      return { error: error.code, message: error.message };
    }

    // Unhandled — log and return generic 500
    set.status = 500;
    console.error('[api] unhandled error', error);
    return { error: 'INTERNAL_SERVER_ERROR', message: 'An unexpected error occurred' };
  })
  .use(healthRoute)
  .use(authRoute)
  .use(reminderCron)
  .listen(env.port);

console.info(`[api] TripFlow API listening on http://${app.server?.hostname}:${app.server?.port}`);

export type App = typeof app;
