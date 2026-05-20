import { createBrowserSupabaseClient } from '@trip-flow/db/browser';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    '[web] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — copy .env.example to .env',
  );
}

export const supabase = createBrowserSupabaseClient({ url, anonKey });
