import { pgTable, text, timestamp, boolean, integer, jsonb, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Note: `owner_id` maps to the Supabase auth.users table, but we don't define the auth schema here.
export const trips = pgTable('trips', {
  id: uuid('id').primaryKey().defaultRandom(),
  owner_id: uuid('owner_id').notNull(),
  title: text('title').notNull(),
  starts_on: timestamp('starts_on', { withTimezone: true, mode: 'string' }).notNull(),
  ends_on: timestamp('ends_on', { withTimezone: true, mode: 'string' }).notNull(),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const tripItems = pgTable('trip_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  trip_id: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  day_index: integer('day_index').notNull(),
  position: integer('position').notNull(),
  place: jsonb('place').notNull(), // Stores Google Maps Place result
  notes: text('notes'),
  created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export const reminders = pgTable('reminders', {
  id: uuid('id').primaryKey().defaultRandom(),
  trip_id: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  cron_expression: text('cron_expression').notNull(),
  channel: text('channel', { enum: ['email', 'push', 'webhook'] }).notNull(),
  payload: jsonb('payload').notNull(),
  enabled: boolean('enabled').notNull().default(true),
  last_run_at: timestamp('last_run_at', { withTimezone: true, mode: 'string' }),
});
