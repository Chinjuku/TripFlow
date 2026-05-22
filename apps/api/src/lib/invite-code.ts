/**
 * Short, human-shareable invite codes.
 *
 * Alphabet excludes ambiguous glyphs (0/O, 1/I, L) so codes are safe to
 * read aloud or transcribe by hand. 31 chars ^ 6 ≈ 887M combinations —
 * collision-resistant enough that the database UNIQUE index will catch
 * any rare clash and the caller can simply retry.
 */
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

export function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

/**
 * Normalises user-typed codes before lookup: trim, upper-case, drop spaces.
 * We intentionally keep "0/O" etc. distinct — if a user types one wrong
 * the lookup misses and they retry, which is safer than silently coercing.
 */
export function normaliseInviteCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, '');
}
