import {
  db,
  settlements,
  trips,
  type Settlement,
} from '@trip-flow/db/server';
import { and, eq } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors/domain';
import { loadTripMembers } from './trips';
import { ensureTripMember } from './finances';
import type { HydratedSettlement } from '../models/finances';

export interface CreateSettlementInput {
  tripId: string;
  payeeId: string;
  payerId?: string;
  amount: number;
  isCentralFund?: boolean;
}

/**
 * Creates a pending settlement transaction.
 */
export async function createSettlement(
  userId: string,
  input: CreateSettlementInput,
): Promise<HydratedSettlement> {
  const actualPayerId = input.payerId ?? userId;
  await ensureTripMember(actualPayerId, input.tripId);
  await ensureTripMember(input.payeeId, input.tripId);

  if (actualPayerId === input.payeeId) {
    throw new Error('You cannot settle up with yourself');
  }

  if (actualPayerId !== userId) {
    if (!input.isCentralFund) {
      throw new Error(
        'You can only create settlements on behalf of someone else for central fund requests',
      );
    }
    const [trip] = await db.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
    if (actualPayerId !== trip?.treasurer_id) {
      throw new Error('You can only request central fund reimbursement from the treasurer');
    }
    if (input.payeeId !== userId) {
      throw new Error('You can only request reimbursement for yourself');
    }
  }

  if (input.isCentralFund) {
    const [trip] = await db.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
    if (trip && trip.central_fund_per_person) {
      if (actualPayerId === userId && actualPayerId !== trip.treasurer_id) {
        const userCentralSettlements = await db
          .select()
          .from(settlements)
          .where(
            and(
              eq(settlements.trip_id, input.tripId),
              eq(settlements.payer_id, actualPayerId),
              eq(settlements.is_central_fund, true),
            ),
          );

        const currentPaidAndPending = userCentralSettlements.reduce((acc, s) => acc + s.amount, 0);
        if (currentPaidAndPending + input.amount > trip.central_fund_per_person) {
          throw new ConflictError(
            `Cannot pay more than the required central fund amount (฿${trip.central_fund_per_person.toLocaleString()})`,
          );
        }
      }
    }
  }

  const [created] = await db
    .insert(settlements)
    .values({
      trip_id: input.tripId,
      payer_id: actualPayerId,
      payee_id: input.payeeId,
      amount: input.amount,
      is_central_fund: input.isCentralFund ?? false,
      status: 'pending',
    })
    .returning();

  if (!created) throw new Error('Failed to record settlement');

  const members = await loadTripMembers(input.tripId);
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const payer = memberMap.get(created.payer_id);
  const payee = memberMap.get(created.payee_id);

  return {
    ...created,
    payerName: payer?.name ?? 'Traveller',
    payerAvatarUrl: payer?.avatarUrl ?? null,
    payeeName: payee?.name ?? 'Traveller',
    payeeAvatarUrl: payee?.avatarUrl ?? null,
  };
}

/**
 * Confirms a settlement as completed (marks as paid).
 */
export async function confirmSettlement(
  userId: string,
  settlementId: string,
): Promise<HydratedSettlement> {
  const [settlement] = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  if (!settlement) {
    throw new NotFoundError('Settlement not found');
  }

  // Ensure caller is the payee (recipient of money), since they should be the one confirming they received it.
  // In central fund settlements, the treasurer can also confirm payouts or contributions.
  // In development mode, we allow the payer to confirm as well to facilitate testing.
  const [trip] = await db.select().from(trips).where(eq(trips.id, settlement.trip_id)).limit(1);
  const isTreasurer = trip?.treasurer_id === userId;

  const isDev = process.env.NODE_ENV === 'development';
  if (
    settlement.payee_id !== userId &&
    !(settlement.is_central_fund && isTreasurer) &&
    !(isDev && settlement.payer_id === userId)
  ) {
    throw new ForbiddenError(
      'Only the recipient of the settlement or the treasurer can confirm it',
    );
  }

  const [updated] = await db
    .update(settlements)
    .set({ status: 'completed', updated_at: new Date().toISOString() })
    .where(eq(settlements.id, settlementId))
    .returning();

  if (!updated) throw new Error('Failed to confirm settlement');

  const members = await loadTripMembers(updated.trip_id);
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const payer = memberMap.get(updated.payer_id);
  const payee = memberMap.get(updated.payee_id);

  return {
    ...updated,
    payerName: payer?.name ?? 'Traveller',
    payerAvatarUrl: payer?.avatarUrl ?? null,
    payeeName: payee?.name ?? 'Traveller',
    payeeAvatarUrl: payee?.avatarUrl ?? null,
  };
}

/**
 * Deletes/rejects a settlement (pending or completed).
 */
export async function deleteSettlement(
  userId: string,
  settlementId: string,
): Promise<{ success: boolean }> {
  const [settlement] = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  if (!settlement) {
    throw new NotFoundError('Settlement not found');
  }

  const [trip] = await db.select().from(trips).where(eq(trips.id, settlement.trip_id)).limit(1);

  const isTreasurer = trip?.treasurer_id === userId;

  if (
    settlement.payer_id !== userId &&
    settlement.payee_id !== userId &&
    !(settlement.is_central_fund && isTreasurer)
  ) {
    throw new ForbiddenError('You do not have permission to delete this settlement');
  }

  await db.delete(settlements).where(eq(settlements.id, settlementId));

  return { success: true };
}
