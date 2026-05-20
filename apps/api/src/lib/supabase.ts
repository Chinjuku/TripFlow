import { createServerSupabaseClient } from '@trip-flow/db/server';
import { env } from '../env';

export const supabase = createServerSupabaseClient({
  url: env.supabaseUrl,
  serviceRoleKey: env.supabaseServiceRoleKey,
});
