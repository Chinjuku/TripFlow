/**
 * Server-side database entry point.
 *
 * Re-exports the Drizzle client and the full schema (tables + inferred
 * types). This is the single import surface for the API layer:
 *
 *   import { db, users, trips, type User } from '@trip-flow/db/server';
 */

export * from './drizzle';
export * from './schema';
