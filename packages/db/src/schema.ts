import {
  doublePrecision,
  pgTable,
  text,
  timestamp,
  integer,
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

/**
 * Candidate places picked for a trip during the suggestions + voting stage.
 *
 * `external_id` is the Google Places place_id — the unique index keeps a
 * single place from being added twice to the same trip.
 */
export const tripPlaces = pgTable(
  'trip_places',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    external_id: text('external_id').notNull(),
    name: text('name').notNull(),
    address: text('address'),
    category: text('category'),
    lat: doublePrecision('lat'),
    lng: doublePrecision('lng'),
    photo_url: text('photo_url'),
    /** Google rating snapshot at the time the place was added (0–5). */
    rating: doublePrecision('rating'),
    /** Human-readable hours snapshot from Google, e.g. "Open until 6:00 PM". */
    opening_hours_text: text('opening_hours_text'),
    /** How long the group plans to stay, set by the adder. */
    stay_minutes: integer('stay_minutes'),
    added_by_user_id: uuid('added_by_user_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tripExternalUq: uniqueIndex('trip_places_trip_external_uq').on(
      table.trip_id,
      table.external_id,
    ),
    tripIdx: index('trip_places_trip_idx').on(table.trip_id),
  }),
);

/**
 * One like per user per place. Presence of the row = liked; absence = not.
 * The composite primary key enforces "one like per user per place" without
 * needing a separate unique constraint.
 */
export const tripPlaceVotes = pgTable(
  'trip_place_votes',
  {
    trip_place_id: uuid('trip_place_id')
      .notNull()
      .references(() => tripPlaces.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.trip_place_id, table.user_id] }),
  }),
);

/**
 * A place placed on the day-by-day itinerary. Promoted out of trip_places
 * after voting; the FK with onDelete cascade means removing a candidate
 * automatically clears anywhere it was scheduled.
 *
 * `start_minute` is minutes since 00:00 — keeps the row sortable without
 * dragging timezones into the math. Default duration is 60 min.
 */
export const tripScheduleItems = pgTable(
  'trip_schedule_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    trip_place_id: uuid('trip_place_id')
      .notNull()
      .references(() => tripPlaces.id, { onDelete: 'cascade' }),
    day_index: integer('day_index').notNull(),
    start_minute: integer('start_minute').notNull(),
    duration_minutes: integer('duration_minutes').notNull().default(60),
    notes: text('notes'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tripDayIdx: index('trip_schedule_items_trip_day_idx').on(
      table.trip_id,
      table.day_index,
    ),
  }),
);

export type Trip = typeof trips.$inferSelect;
export type NewTrip = typeof trips.$inferInsert;
export type TripMember = typeof tripMembers.$inferSelect;
export type NewTripMember = typeof tripMembers.$inferInsert;
export type TripPlace = typeof tripPlaces.$inferSelect;
export type NewTripPlace = typeof tripPlaces.$inferInsert;
export type TripPlaceVote = typeof tripPlaceVotes.$inferSelect;
export type NewTripPlaceVote = typeof tripPlaceVotes.$inferInsert;
export type TripScheduleItem = typeof tripScheduleItems.$inferSelect;
export type NewTripScheduleItem = typeof tripScheduleItems.$inferInsert;
