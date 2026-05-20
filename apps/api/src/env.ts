/**
 * Centralised, fail-fast env loader.
 * Import `env` everywhere instead of touching `process.env` directly so that
 * missing configuration crashes at boot — never silently at request time.
 */
const required = (key: string): string => {
  const value = process.env[key];
  if (!value || value.trim().length === 0) {
    throw new Error(`[env] Missing required environment variable: ${key}`);
  }
  return value;
};

const optional = (key: string, fallback: string): string => process.env[key]?.trim() || fallback;

export const env = {
  nodeEnv: optional('NODE_ENV', 'development'),
  port: Number.parseInt(optional('PORT', '4000'), 10),
  supabaseUrl: required('SUPABASE_URL'),
  supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  jwtSecret: required('JWT_SECRET'),
  webUrl: required('WEB_URL'),
} as const;

export type Env = typeof env;
