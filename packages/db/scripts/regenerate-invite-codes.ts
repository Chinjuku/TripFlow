/**
 * One-off migration: rewrite every trips.invite_code from the legacy
 * 8-character format to the current 6-character format.
 *
 * Run with:  bun --env-file ../../.env packages/db/scripts/regenerate-invite-codes.ts
 *
 * Idempotent in the sense that re-running just generates a fresh set of
 * 6-char codes — but anyone holding an old code can no longer join, so
 * only run it intentionally.
 */
import { db, trips } from '../src/server';
import { eq, sql } from 'drizzle-orm';

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LENGTH = 6;

function generateInviteCode(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(CODE_LENGTH));
  let out = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHABET[bytes[i]! % ALPHABET.length];
  }
  return out;
}

async function main() {
  // Pick up only the trips that still carry a non-6-char code, so re-runs
  // don't churn already-migrated rows.
  const legacy = await db
    .select({ id: trips.id, code: trips.invite_code, title: trips.title })
    .from(trips)
    .where(sql`length(${trips.invite_code}) <> ${CODE_LENGTH}`);

  if (legacy.length === 0) {
    console.log('Nothing to migrate — all invite codes already at length', CODE_LENGTH);
    return;
  }

  console.log(`Regenerating ${legacy.length} invite code(s)…`);

  let updated = 0;
  for (const row of legacy) {
    // Retry on the (extremely rare) collision against an existing 6-char code.
    for (let attempt = 0; attempt < 5; attempt++) {
      const next = generateInviteCode();
      try {
        await db.update(trips).set({ invite_code: next }).where(eq(trips.id, row.id));
        console.log(`  ${row.title}: ${row.code} → ${next}`);
        updated++;
        break;
      } catch (err) {
        if (
          typeof err === 'object' &&
          err !== null &&
          'code' in err &&
          (err as { code: string }).code === '23505' &&
          attempt < 4
        ) {
          continue;
        }
        throw err;
      }
    }
  }

  console.log(`Done. Updated ${updated}/${legacy.length}.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
