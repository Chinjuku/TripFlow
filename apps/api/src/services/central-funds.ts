import { db, trips, settlements } from '@trip-flow/db/server';
import { and, eq } from 'drizzle-orm';
import { NotFoundError, ForbiddenError, ConflictError } from '../errors/domain';
import { ensureTripMember } from './finances';

export interface UpdateCentralFundInput {
  tripId: string;
  treasurerId: string | null;
  centralFundPerPerson: number | null;
}

/**
 * Updates the central fund configuration for the trip.
 */
export async function updateCentralFund(
  userId: string,
  input: UpdateCentralFundInput,
): Promise<any> {
  const [trip] = await db.select().from(trips).where(eq(trips.id, input.tripId)).limit(1);
  if (!trip) throw new NotFoundError('Trip not found');

  const isOwner = trip.owner_id === userId;
  const isTreasurer = trip.treasurer_id === userId;

  if (!isOwner && !isTreasurer) {
    throw new ForbiddenError(
      'Only the trip owner or the treasurer can update the central fund settings',
    );
  }

  // If treasurer is calling, they cannot change the treasurer
  if (isTreasurer && !isOwner) {
    if (input.treasurerId !== trip.treasurer_id) {
      throw new ForbiddenError('The treasurer cannot change the treasurer assignment');
    }
  }

  // If owner is calling, and central fund is already configured, they cannot change the amount
  const isConfigured = Boolean(
    trip.treasurer_id && trip.central_fund_per_person && Number(trip.central_fund_per_person) > 0,
  );
  if (isOwner && isConfigured) {
    if (
      input.centralFundPerPerson !== null &&
      Number(input.centralFundPerPerson) !== Number(trip.central_fund_per_person)
    ) {
      throw new ForbiddenError(
        'Only the treasurer can update the central fund amount per person after setup',
      );
    }
  }

  // Prevent changing the treasurer if any contributions already exist
  if (isOwner && input.treasurerId !== trip.treasurer_id && trip.treasurer_id !== null) {
    const centralSettlements = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.trip_id, input.tripId),
          eq(settlements.is_central_fund, true),
          eq(settlements.payee_id, trip.treasurer_id),
        ),
      );

    if (centralSettlements.length > 0) {
      throw new ConflictError(
        'Cannot change the treasurer because contributions have already been made',
      );
    }
  }

  // Prevent decreasing the per-person amount if contributions already exist
  if (
    input.centralFundPerPerson !== null &&
    trip.central_fund_per_person !== null &&
    Number(input.centralFundPerPerson) < Number(trip.central_fund_per_person)
  ) {
    const centralSettlements = await db
      .select()
      .from(settlements)
      .where(
        and(
          eq(settlements.trip_id, input.tripId),
          eq(settlements.is_central_fund, true),
          eq(settlements.payee_id, trip.treasurer_id || ''),
        ),
      );

    if (centralSettlements.length > 0) {
      throw new ConflictError(
        'Cannot decrease the amount per person because members have already made contributions',
      );
    }
  }

  if (input.treasurerId) {
    await ensureTripMember(input.treasurerId, input.tripId);
  }

  const [updated] = await db
    .update(trips)
    .set({
      treasurer_id: input.treasurerId,
      central_fund_per_person: input.centralFundPerPerson,
    })
    .where(eq(trips.id, input.tripId))
    .returning();

  if (!updated) throw new Error('Failed to update central fund settings');
  return updated;
}
