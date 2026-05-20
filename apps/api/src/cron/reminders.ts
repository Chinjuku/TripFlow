import { cron, Patterns } from '@elysiajs/cron';
import { Elysia } from 'elysia';
import { supabase } from '../lib/supabase';

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

      const { data, error } = await supabase
        .from('reminders')
        .select('id, trip_id, channel, payload')
        .eq('enabled', true)
        .or(`last_run_at.is.null,last_run_at.lt.${now}`)
        .limit(50);

      if (error) {
        console.error('[cron] reminders poll failed', error);
        return;
      }
      if (!data || data.length === 0) return;

      // TODO: hand off to channel dispatchers (email/push/webhook).
      console.info(`[cron] dispatching ${data.length} reminder(s)`);
    },
  }),
);
