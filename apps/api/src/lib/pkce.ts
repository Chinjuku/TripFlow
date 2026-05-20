/**
 * PKCE (Proof Key for Code Exchange) utilities — RFC 7636.
 *
 * Used to secure the OAuth authorization-code flow between our API
 * and Supabase Auth so that intercepted auth codes cannot be replayed.
 */

/**
 * Generates a cryptographically random code verifier (43–128 chars, base64url).
 */
export function generateCodeVerifier(): string {
  const buffer = crypto.getRandomValues(new Uint8Array(32));
  return base64UrlEncode(buffer);
}

/**
 * Derives the S256 code challenge from a code verifier.
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Encodes a byte array to a base64url string (no padding).
 */
function base64UrlEncode(bytes: Uint8Array): string {
  const binary = String.fromCharCode(...bytes);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
