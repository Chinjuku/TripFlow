/**
 * Places service — owns the "pick + vote" stage of trip planning.
 *
 * Voting is a simple like: presence of a row in trip_place_votes = liked.
 * Membership is enforced at the service layer (every entry point checks
 * `assertMember`) so routes stay thin.
 */

import { db, tripMembers, tripPlaces, tripPlaceVotes, type TripPlace } from '@trip-flow/db/server';
import { and, eq, sql } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '../errors/domain';

export interface TripPlaceWithVotes {
  id: string;
  externalId: string;
  name: string;
  address: string | null;
  nameEn: string | null;
  addressEn: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  rating: number | null;
  openingHoursText: string | null;
  stayMinutes: number | null;
  addedByUserId: string;
  createdAt: string;
  voteCount: number;
  liked: boolean;
}

export interface AddPlaceInput {
  externalId: string;
  name: string;
  address?: string | null;
  nameEn?: string | null;
  addressEn?: string | null;
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
  rating?: number | null;
  openingHoursText?: string | null;
  stayMinutes?: number | null;
}

async function assertMember(userId: string, tripId: string): Promise<void> {
  const [row] = await db
    .select({ trip_id: tripMembers.trip_id })
    .from(tripMembers)
    .where(and(eq(tripMembers.trip_id, tripId), eq(tripMembers.user_id, userId)))
    .limit(1);

  if (!row) {
    // Same as getTripDetail: don't leak existence.
    throw new NotFoundError('Trip not found');
  }
}

function toRow(place: TripPlace, voteCount: number, liked: boolean): TripPlaceWithVotes {
  return {
    id: place.id,
    externalId: place.external_id,
    name: place.name,
    address: place.address,
    nameEn: place.name_en,
    addressEn: place.address_en,
    category: place.category,
    lat: place.lat,
    lng: place.lng,
    photoUrl: place.photo_url,
    rating: place.rating,
    openingHoursText: place.opening_hours_text,
    stayMinutes: place.stay_minutes,
    addedByUserId: place.added_by_user_id,
    createdAt: place.created_at,
    voteCount,
    liked,
  };
}

/**
 * Lists every candidate place for a trip, sorted by vote count desc then
 * created_at asc (oldest pick wins ties — earlier suggesters get visibility).
 */
export async function listPlaces(userId: string, tripId: string): Promise<TripPlaceWithVotes[]> {
  await assertMember(userId, tripId);

  const rows = await db
    .select({
      place: tripPlaces,
      voteCount: sql<number>`count(${tripPlaceVotes.user_id})::int`.as('vote_count'),
      liked: sql<boolean>`bool_or(${tripPlaceVotes.user_id} = ${userId})`.as('liked'),
    })
    .from(tripPlaces)
    .leftJoin(tripPlaceVotes, eq(tripPlaceVotes.trip_place_id, tripPlaces.id))
    .where(eq(tripPlaces.trip_id, tripId))
    .groupBy(tripPlaces.id)
    .orderBy(sql`vote_count desc, ${tripPlaces.created_at} asc`);

  return rows.map((r) => toRow(r.place, r.voteCount, r.liked ?? false));
}

export async function addPlace(
  userId: string,
  tripId: string,
  input: AddPlaceInput,
): Promise<TripPlaceWithVotes> {
  await assertMember(userId, tripId);

  const [inserted] = await db
    .insert(tripPlaces)
    .values({
      trip_id: tripId,
      external_id: input.externalId,
      name: input.name,
      address: input.address ?? null,
      name_en: input.nameEn ?? null,
      address_en: input.addressEn ?? null,
      category: input.category ?? null,
      lat: input.lat ?? null,
      lng: input.lng ?? null,
      photo_url: input.photoUrl ?? null,
      rating: input.rating ?? null,
      opening_hours_text: input.openingHoursText ?? null,
      stay_minutes: input.stayMinutes ?? null,
      added_by_user_id: userId,
    })
    .onConflictDoNothing({ target: [tripPlaces.trip_id, tripPlaces.external_id] })
    .returning();

  // Conflict path: the place is already on this trip — fetch the existing row.
  if (!inserted) {
    const [existing] = await db
      .select()
      .from(tripPlaces)
      .where(and(eq(tripPlaces.trip_id, tripId), eq(tripPlaces.external_id, input.externalId)))
      .limit(1);
    if (!existing) throw new Error('Insert returned no row and lookup missed');
    return toRow(existing, 0, false);
  }

  return toRow(inserted, 0, false);
}

export async function removePlace(userId: string, tripId: string, placeId: string): Promise<void> {
  await assertMember(userId, tripId);

  const [place] = await db
    .select({ id: tripPlaces.id, added_by: tripPlaces.added_by_user_id })
    .from(tripPlaces)
    .where(and(eq(tripPlaces.id, placeId), eq(tripPlaces.trip_id, tripId)))
    .limit(1);

  if (!place) throw new NotFoundError('Place not found');

  if (place.added_by !== userId) {
    throw new ForbiddenError('Only the user who added this place can remove it');
  }

  await db.delete(tripPlaces).where(eq(tripPlaces.id, placeId));
}

/**
 * Toggles the caller's like for a place. `liked=true` inserts a row;
 * `liked=false` deletes it. Idempotent in both directions.
 */
export async function setLike(
  userId: string,
  tripId: string,
  placeId: string,
  liked: boolean,
): Promise<TripPlaceWithVotes> {
  await assertMember(userId, tripId);

  const [place] = await db
    .select()
    .from(tripPlaces)
    .where(and(eq(tripPlaces.id, placeId), eq(tripPlaces.trip_id, tripId)))
    .limit(1);

  if (!place) throw new NotFoundError('Place not found');

  if (liked) {
    await db
      .insert(tripPlaceVotes)
      .values({ trip_place_id: placeId, user_id: userId })
      .onConflictDoNothing();
  } else {
    await db
      .delete(tripPlaceVotes)
      .where(and(eq(tripPlaceVotes.trip_place_id, placeId), eq(tripPlaceVotes.user_id, userId)));
  }

  const [counted] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(tripPlaceVotes)
    .where(eq(tripPlaceVotes.trip_place_id, placeId));

  return toRow(place, counted?.count ?? 0, liked);
}
