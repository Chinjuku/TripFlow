import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export interface ServerClientConfig {
  url: string;
  serviceRoleKey: string;
}

/**
 * Creates a Supabase client with elevated privileges for server-side use.
 * Never expose the service-role key to the browser.
 */
export function createServerSupabaseClient(config: ServerClientConfig): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        'X-Client-Info': 'trip-flow-api',
      },
    },
  });
}

export * from './drizzle';
export * from './schema';
