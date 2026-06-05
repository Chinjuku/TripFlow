import { db } from './packages/db/src/index';
import { trips } from './packages/db/src/schema';
import { eq } from 'drizzle-orm';

async function main() {
  try {
    const res = await db
      .select()
      .from(trips)
      .where(eq(trips.id, 'd72bfd79-2817-4ff3-89c9-09fe88eb9cb0'));
    console.log('trips:', res);
  } catch (err) {
    console.error('DB error:', err);
  }
}
main();
