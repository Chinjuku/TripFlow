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
  googleClientId: required('GOOGLE_CLIENT_ID'),
  googleClientSecret: required('GOOGLE_CLIENT_SECRET'),
  /**
   * Absolute URL Google redirects back to after consent — must match a URI
   * whitelisted in the Google Cloud OAuth client exactly, e.g.
   * `http://localhost:4000/auth/callback`.
   */
  googleRedirectUri: required('GOOGLE_REDIRECT_URI'),
  jwtSecret: required('JWT_SECRET'),
  webUrl: required('WEB_URL'),
  databaseUrl: required('DATABASE_URL'),
  typhoonOcrApiKey: optional('TYPHOON_OCR_API_KEY', ''),
} as const;

export type Env = typeof env;
