import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Connection string must be provided by the consumer (apps/api) environment
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error('DATABASE_URL is missing. Please set it in your environment variables.');
}

// Disable prefetch as it is not supported for "Transaction" pool mode (default in Supabase Pooler)
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });
