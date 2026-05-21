import { cron, Patterns } from '@elysiajs/cron';
import { Elysia } from 'elysia';
import { db, reminders } from '@trip-flow/db/server';
import { eq, or, isNull, lt } from 'drizzle-orm';

/**
 * Master polling worker.
 * Runs every minute, claims due reminders, and dispatches them to the
 * appropriate channel. Keep this idempotent — the same reminder may be
 * picked up twice during a deploy or failover.
 */
export const reminderCron = new Elysia({ name: 'cron/reminders' }).use(
  cron({
    name: 'reminders-poll',
    pattern: Patterns.everyMinute(),
    async run() {
      const now = new Date().toISOString();

      try {
        const dueReminders = await db
          .select({
            id: reminders.id,
            trip_id: reminders.trip_id,
            channel: reminders.channel,
            payload: reminders.payload,
          })
          .from(reminders)
          .where(
            eq(reminders.enabled, true),
          )
          .limit(50);

        if (dueReminders.length === 0) return;

        // TODO: hand off to channel dispatchers (email/push/webhook).
        console.info(`[cron] dispatching ${dueReminders.length} reminder(s)`);
      } catch (error) {
        console.error('[cron] reminders poll failed', error);
      }
    },
  }),
);
