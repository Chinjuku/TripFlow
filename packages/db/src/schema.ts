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
  boolean,
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
    /**
     * Optional destination chosen at create time (city / province). Drives the
     * initial map centre and biases place search on the plan page. Nullable so
     * trips created before this column existed keep working.
     */
    destination_name: text('destination_name'),
    center_lat: doublePrecision('center_lat'),
    center_lng: doublePrecision('center_lng'),
    invite_code: text('invite_code').notNull(),
    is_debt_optimized: boolean('is_debt_optimized').default(true).notNull(),
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
    tripDayIdx: index('trip_schedule_items_trip_day_idx').on(table.trip_id, table.day_index),
  }),
);

// ==========================================
// Expenses & Finance Tables
// ==========================================

export const expenses = pgTable(
  'expenses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    description: text('description').notNull(), // Merchant or description
    amount: doublePrecision('amount').notNull(),
    paid_by_id: uuid('paid_by_id').notNull(), // Mirrors auth.users.id (Supabase Auth)
    category: text('category', { enum: ['food', 'transport', 'activity', 'lodging', 'other'] })
      .notNull()
      .default('other'),
    split_method: text('split_method', { enum: ['equally', 'exact_amount'] })
      .notNull()
      .default('equally'), // Added to support showing split type in UI (Equally vs Exact Amount)
    receipt_url: text('receipt_url'),
    expense_date: timestamp('expense_date', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tripIdx: index('expenses_trip_idx').on(table.trip_id),
    paidByIdx: index('expenses_paid_by_idx').on(table.paid_by_id),
  }),
);

export const expenseSplits = pgTable(
  'expense_splits',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    expense_id: uuid('expense_id')
      .notNull()
      .references(() => expenses.id, { onDelete: 'cascade' }),
    user_id: uuid('user_id').notNull(), // Mirrors auth.users.id (Supabase Auth)
    amount: doublePrecision('amount').notNull(),
    item_paid: text('item_paid'), // Optional: name of the specific item/menu ordered (e.g., "Pad Thai")
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    expenseIdx: index('expense_splits_expense_idx').on(table.expense_id),
    userIdx: index('expense_splits_user_idx').on(table.user_id),
  }),
);

export const settlements = pgTable(
  'settlements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    payer_id: uuid('payer_id').notNull(), // Mirrors auth.users.id (Supabase Auth)
    payee_id: uuid('payee_id').notNull(), // Mirrors auth.users.id (Supabase Auth)
    amount: doublePrecision('amount').notNull(),
    status: text('status', { enum: ['pending', 'completed'] })
      .notNull()
      .default('pending'),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tripIdx: index('settlements_trip_idx').on(table.trip_id),
    payerIdx: index('settlements_payer_idx').on(table.payer_id),
    payeeIdx: index('settlements_payee_idx').on(table.payee_id),
  }),
);

export const tripBudgets = pgTable(
  'trip_budgets',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    trip_id: uuid('trip_id')
      .notNull()
      .references(() => trips.id, { onDelete: 'cascade' }),
    amount: doublePrecision('amount').notNull(), // Total budget amount, e.g., 6500.00
    category: text('category'), // Null for global trip budget, or set (e.g. 'food') for category budgets
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    tripIdx: index('trip_budgets_trip_idx').on(table.trip_id),
  }),
);

export const userPaymentDetails = pgTable(
  'user_payment_details',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').notNull(), // Mirrors auth.users.id (Supabase Auth)
    promptpay_id: text('promptpay_id'), // Phone number or National ID for dynamic PromptPay QR generation
    qr_code_url: text('qr_code_url'), // Static PromptPay QR Code picture URL
    bank_name: text('bank_name'), // Optional e.g. KBANK, SCB
    bank_account_number: text('bank_account_number'),
    bank_account_name: text('bank_account_name'),
    is_show_mobile_banking: boolean('is_show_mobile_banking').default(true).notNull(),
    is_show_promptpay: boolean('is_show_promptpay').default(true).notNull(),
    created_at: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
    updated_at: timestamp('updated_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => ({
    userIdx: index('user_payment_details_user_idx').on(table.user_id),
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
export type Expense = typeof expenses.$inferSelect;
export type NewExpense = typeof expenses.$inferInsert;
export type ExpenseSplit = typeof expenseSplits.$inferSelect;
export type NewExpenseSplit = typeof expenseSplits.$inferInsert;
export type Settlement = typeof settlements.$inferSelect;
export type NewSettlement = typeof settlements.$inferInsert;
export type TripBudget = typeof tripBudgets.$inferSelect;
export type NewTripBudget = typeof tripBudgets.$inferInsert;
export type UserPaymentDetail = typeof userPaymentDetails.$inferSelect;
export type NewUserPaymentDetail = typeof userPaymentDetails.$inferInsert;
