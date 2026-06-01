/**
 * Trips service — business logic for trip CRUD and membership.
 *
 * HTTP-agnostic: takes plain inputs, returns plain data, throws domain
 * errors. The controller layer adapts these to HTTP responses.
 */

import { db, trips, tripMembers, type Trip } from '@trip-flow/db/server';
import { and, desc, eq, inArray } from 'drizzle-orm';
import { ConflictError, ForbiddenError, NotFoundError } from '../errors/domain';
import { generateInviteCode, normaliseInviteCode } from '../lib/invite-code';
import { getUserById } from './auth';

export interface CreateTripInput {
  title: string;
  startsOn: string;
  endsOn: string;
  destinationName?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
}

export interface TripSummary {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  inviteCode: string;
  isDebtOptimized: boolean;
  destinationName: string | null;
  centerLat: number | null;
  centerLng: number | null;
  role: 'owner' | 'member';
  createdAt: string;
  members: TripMemberProfile[];
}

export interface TripMemberProfile {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface TripDetail extends TripSummary {
  ownerId: string;
}

function toSummary(
  trip: Trip,
  role: 'owner' | 'member',
  members: TripMemberProfile[],
): TripSummary {
  return {
    id: trip.id,
    title: trip.title,
    startsOn: trip.starts_on,
    endsOn: trip.ends_on,
    inviteCode: trip.invite_code,
    isDebtOptimized: trip.is_debt_optimized,
    destinationName: trip.destination_name,
    centerLat: trip.center_lat,
    centerLng: trip.center_lng,
    role,
    createdAt: trip.created_at,
    members,
  };
}

/**
 * Resolves user_ids to TripMemberProfile rows in a single Supabase round
 * per unique id. Failures fall back to a "Traveller" placeholder so a
 * stale auth row never breaks the trip card UI.
 */
async function hydrateMemberProfiles(
  rows: { trip_id: string; user_id: string; role: 'owner' | 'member'; joined_at: string }[],
): Promise<Map<string, TripMemberProfile[]>> {
  const uniqueUserIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const profileEntries = await Promise.all(
    uniqueUserIds.map(async (id) => {
      const p = await getUserById(id).catch(() => null);
      return [id, p] as const;
    }),
  );
  const profileById = new Map(profileEntries);

  const byTrip = new Map<string, TripMemberProfile[]>();
  for (const r of rows) {
    const p = profileById.get(r.user_id) ?? null;
    const member: TripMemberProfile = {
      userId: r.user_id,
      role: r.role,
      joinedAt: r.joined_at,
      name: p?.name ?? 'Traveller',
      email: p?.email ?? '',
      avatarUrl: p?.avatarUrl ?? null,
    };
    const list = byTrip.get(r.trip_id) ?? [];
    list.push(member);
    byTrip.set(r.trip_id, list);
  }
  return byTrip;
}

/**
 * Lists every trip the user is a member of, newest first, each with its
 * full member roster (used by the trip card avatar stack).
 */
export async function listTripsForUser(userId: string): Promise<TripSummary[]> {
  const rows = await db
    .select({
      trip: trips,
      role: tripMembers.role,
    })
    .from(tripMembers)
    .innerJoin(trips, eq(trips.id, tripMembers.trip_id))
    .where(eq(tripMembers.user_id, userId))
    .orderBy(desc(trips.created_at));

  if (rows.length === 0) return [];

  const tripIds = rows.map((r) => r.trip.id);
  const memberRows = await db
    .select()
    .from(tripMembers)
    .where(inArray(tripMembers.trip_id, tripIds));
  const membersByTrip = await hydrateMemberProfiles(memberRows);

  return rows.map((row) => toSummary(row.trip, row.role, membersByTrip.get(row.trip.id) ?? []));
}

/**
 * Creates a trip with the caller as the owner.
 * Wraps the trip insert + owner membership in a single transaction so a
 * partial failure can never leave an orphaned trip.
 */
export async function createTrip(ownerId: string, input: CreateTripInput): Promise<TripSummary> {
  // Destination is required (NOT NULL column + product rule).
  const destinationName = input.destinationName?.trim();
  if (!destinationName) {
    throw new ConflictError('A destination is required to create a trip');
  }

  // Retry once on the (extremely rare) collision of an 8-char code.
  for (let attempt = 0; attempt < 3; attempt++) {
    const inviteCode = generateInviteCode();

    try {
      const trip = await db.transaction(async (tx) => {
        const [created] = await tx
          .insert(trips)
          .values({
            owner_id: ownerId,
            title: input.title,
            starts_on: input.startsOn,
            ends_on: input.endsOn,
            destination_name: destinationName,
            center_lat: input.centerLat ?? null,
            center_lng: input.centerLng ?? null,
            invite_code: inviteCode,
          })
          .returning();

        if (!created) throw new Error('Insert returned no row');

        await tx.insert(tripMembers).values({
          trip_id: created.id,
          user_id: ownerId,
          role: 'owner',
        });

        return created;
      });

      return toSummary(trip, 'owner', await loadTripMembers(trip.id));
    } catch (err) {
      // Postgres unique_violation on invite_code — try again with a fresh code.
      if (isUniqueViolation(err) && attempt < 2) continue;
      throw err;
    }
  }

  throw new Error('Failed to generate a unique invite code after 3 attempts');
}

export async function loadTripMembers(tripId: string): Promise<TripMemberProfile[]> {
  const rows = await db.select().from(tripMembers).where(eq(tripMembers.trip_id, tripId));
  const byTrip = await hydrateMemberProfiles(rows);
  return byTrip.get(tripId) ?? [];
}

/**
 * Adds the user to a trip identified by its invite code.
 * Idempotent: joining a trip you're already in returns the existing membership.
 */
export async function joinTripByCode(userId: string, rawCode: string): Promise<TripSummary> {
  const code = normaliseInviteCode(rawCode);

  const [trip] = await db.select().from(trips).where(eq(trips.invite_code, code)).limit(1);
  if (!trip) {
    throw new NotFoundError('Invite code not found');
  }

  const [existing] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.trip_id, trip.id), eq(tripMembers.user_id, userId)))
    .limit(1);

  if (existing) {
    return toSummary(trip, existing.role, await loadTripMembers(trip.id));
  }

  await db.insert(tripMembers).values({
    trip_id: trip.id,
    user_id: userId,
    role: 'member',
  });

  return toSummary(trip, 'member', await loadTripMembers(trip.id));
}

/**
 * Loads a single trip with its items + members, enforcing membership.
 *
 * Throws NotFoundError if the trip doesn't exist OR the caller isn't a
 * member — we deliberately don't distinguish the two cases to avoid
 * leaking trip existence to unauthorised callers.
 */
export async function getTripDetail(userId: string, tripId: string): Promise<TripDetail> {
  const [membership] = await db
    .select({ trip: trips, role: tripMembers.role })
    .from(tripMembers)
    .innerJoin(trips, eq(trips.id, tripMembers.trip_id))
    .where(and(eq(tripMembers.trip_id, tripId), eq(tripMembers.user_id, userId)))
    .limit(1);

  if (!membership) {
    throw new NotFoundError('Trip not found');
  }

  const { trip, role } = membership;
  const members = await loadTripMembers(tripId);

  return {
    ...toSummary(trip, role, members),
    ownerId: trip.owner_id,
  };
}

export interface UpdateTripInput {
  title?: string;
  startsOn?: string;
  endsOn?: string;
  destinationName?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
}

/** Loads a trip and asserts the caller owns it. Throws NotFound/Forbidden. */
async function assertOwner(userId: string, tripId: string): Promise<Trip> {
  const [trip] = await db.select().from(trips).where(eq(trips.id, tripId)).limit(1);
  if (!trip) throw new NotFoundError('Trip not found');
  if (trip.owner_id !== userId) {
    throw new ForbiddenError('Only the trip owner can do this');
  }
  return trip;
}

/**
 * Updates editable trip fields (owner only). Only provided fields change;
 * destination cleared by passing null. Returns the refreshed summary.
 */
export async function updateTrip(
  userId: string,
  tripId: string,
  input: UpdateTripInput,
): Promise<TripSummary> {
  await assertOwner(userId, tripId);

  const patch: Partial<typeof trips.$inferInsert> = {};
  if (input.title !== undefined) patch.title = input.title;
  if (input.startsOn !== undefined) patch.starts_on = input.startsOn;
  if (input.endsOn !== undefined) patch.ends_on = input.endsOn;
  // destination_name is required (NOT NULL) — only set it when a real value
  // is provided; ignore null/undefined so it's never cleared.
  if (input.destinationName) patch.destination_name = input.destinationName;
  if (input.centerLat !== undefined) patch.center_lat = input.centerLat;
  if (input.centerLng !== undefined) patch.center_lng = input.centerLng;

  const [updated] = await db
    .update(trips)
    .set(patch)
    .where(eq(trips.id, tripId))
    .returning();
  if (!updated) throw new NotFoundError('Trip not found');

  const [membership] = await db
    .select({ role: tripMembers.role })
    .from(tripMembers)
    .where(and(eq(tripMembers.trip_id, tripId), eq(tripMembers.user_id, userId)))
    .limit(1);

  return toSummary(updated, membership?.role ?? 'owner', await loadTripMembers(tripId));
}

/**
 * Removes a member from a trip (owner only). The owner can't remove
 * themselves — they must delete the trip instead.
 */
export async function removeMember(
  ownerId: string,
  tripId: string,
  targetUserId: string,
): Promise<void> {
  const trip = await assertOwner(ownerId, tripId);
  if (targetUserId === trip.owner_id) {
    throw new ConflictError('The owner cannot be removed from the trip');
  }

  await db
    .delete(tripMembers)
    .where(and(eq(tripMembers.trip_id, tripId), eq(tripMembers.user_id, targetUserId)));
}

/** Permanently deletes a trip and everything under it (owner only). */
export async function deleteTrip(userId: string, tripId: string): Promise<void> {
  await assertOwner(userId, tripId);
  // FK cascades clear members, places, schedule, expenses, etc.
  await db.delete(trips).where(eq(trips.id, tripId));
}

function isUniqueViolation(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    (err as { code: string }).code === '23505'
  );
}

// Future use: throw ConflictError when role transitions clash, ForbiddenError for write gating.
void ConflictError;
void ForbiddenError;
