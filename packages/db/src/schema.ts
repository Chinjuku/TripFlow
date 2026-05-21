import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  jsonb,
  uuid,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

/**
 * A trip is the top-level workspace a group plans together.
 * `owner_id` mirrors `auth.users.id` (we don't define Supabase's auth schema here).
 * `invite_code` lets new members join with a short shareable string.
 */
export const trips = pgTable(
  'trips',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    owner_id: uuid('owner_id').notNull(),
    title: text('title').notNull(),
    starts_on: timestamp('starts_on', { withTimezone: true, mode: 'string' }).notNull(),
    ends_on: timestamp('ends_on', { withTimezone: true, mode: 'string' }).notNull(),
    invite_code: text('invite_code').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    inviteCodeUq: uniqueIndex('trips_invite_code_uq').on(table.invite_code),
  }),
);

/**
 * Membership of a user in a trip.
 * The owner has their own row with role='owner' — `trips.owner_id` is the
 * convenience pointer, but `trip_members` is the source of truth for access.
 */
export const tripMembers = pgTable(
  'trip_members',
  {
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').notNull(),
    role: text('role', { enum: ['owner', 'member'] })
      .notNull()
      .default('member'),
    joined_at: timestamp('joined_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.trip_id, table.user_id] }),
    userIdx: index('trip_members_user_idx').on(table.user_id),
  }),
);

export const tripItems = pgTable('trip_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  trip_id: uuid('trip_id')
    .notNull()
    .references(() => trips.id, { onDelete: 'cascade' }),
  day_index: integer('day_index').notNull(),
  position: integer('position').notNull(),
  place: jsonb('place').notNull(),
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

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripMember = typeof tripMembers.$inferSelect;
export type NewTripMember = typeof tripMembers.$inferInsert;
