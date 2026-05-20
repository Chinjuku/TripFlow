import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './types';

export interface BrowserClientConfig {
  url: string;
  anonKey: string;
}

/**
 * Creates a Supabase client safe for use in browser/client code.
 * Pass values from `import.meta.env.VITE_*` — never the service-role key.
 */
export function createBrowserSupabaseClient(
  config: BrowserClientConfig,
): SupabaseClient<Database> {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}
