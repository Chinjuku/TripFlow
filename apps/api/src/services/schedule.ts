/**
 * Schedule service — places promoted out of trip_places onto a specific
 * day + time slot of the trip itinerary.
 *
 * Membership is enforced at every entry point (same pattern as places).
 */

import {
  db,
  tripMembers,
  tripPlaces,
  tripScheduleItems,
  type OpeningPeriod,
  type TripPlace,
  type TripScheduleItem,
} from '@trip-flow/db/server';
import { and, asc, eq } from 'drizzle-orm';
import { ForbiddenError, NotFoundError } from '../errors/domain';

export interface ScheduleItem {
  id: string;
  tripPlaceId: string;
  dayIndex: number;
  startMinute: number;
  durationMinutes: number;
  notes: string | null;
  createdAt: string;
  /** Place snapshot at fetch time — denormalised for the UI. */
  place: {
    id: string;
    /** Google place_id (or "mock_…" id for legacy rows). */
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
    openingPeriods: OpeningPeriod[] | null;
  };
}

export interface AddScheduleItemInput {
  tripPlaceId: string;
  dayIndex: number;
  startMinute: number;
  durationMinutes?: number;
  notes?: string | null;
}

export interface UpdateScheduleItemInput {
  dayIndex?: number;
  startMinute?: number;
  durationMinutes?: number;
  notes?: string | null;
}

async function assertMember(userId: string, tripId: string): Promise<void> {
  const [row] = await db
    .select({ trip_id: tripMembers.trip_id })
    .from(tripMembers)
    .where(and(eq(tripMembers.trip_id, tripId), eq(tripMembers.user_id, userId)))
    .limit(1);

  if (!row) {
    throw new NotFoundError('Trip not found');
  }
}

function toScheduleItem(item: TripScheduleItem, place: TripPlace): ScheduleItem {
  return {
    id: item.id,
    tripPlaceId: item.trip_place_id,
    dayIndex: item.day_index,
    startMinute: item.start_minute,
    durationMinutes: item.duration_minutes,
    notes: item.notes,
    createdAt: item.created_at,
    place: {
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
      openingPeriods: place.opening_periods,
    },
  };
}

/**
 * Lists every scheduled item for a trip, sorted by (day, start_minute) so
 * the client can render days as contiguous blocks without extra grouping.
 */
export async function listSchedule(userId: string, tripId: string): Promise<ScheduleItem[]> {
  await assertMember(userId, tripId);

  const rows = await db
    .select({ item: tripScheduleItems, place: tripPlaces })
    .from(tripScheduleItems)
    .innerJoin(tripPlaces, eq(tripPlaces.id, tripScheduleItems.trip_place_id))
    .where(eq(tripScheduleItems.trip_id, tripId))
    .orderBy(asc(tripScheduleItems.day_index), asc(tripScheduleItems.start_minute));

  return rows.map((r) => toScheduleItem(r.item, r.place));
}

/**
 * Creates a schedule entry for an existing trip_place. Verifies the
 * place actually belongs to this trip before inserting — prevents
 * cross-trip placeId smuggling.
 */
export async function addScheduleItem(
  userId: string,
  tripId: string,
  input: AddScheduleItemInput,
): Promise<ScheduleItem> {
  await assertMember(userId, tripId);

  const [place] = await db
    .select()
    .from(tripPlaces)
    .where(and(eq(tripPlaces.id, input.tripPlaceId), eq(tripPlaces.trip_id, tripId)))
    .limit(1);

  if (!place) throw new NotFoundError('Place not found');

  const [inserted] = await db
    .insert(tripScheduleItems)
    .values({
      trip_id: tripId,
      trip_place_id: input.tripPlaceId,
      day_index: input.dayIndex,
      start_minute: input.startMinute,
      duration_minutes: input.durationMinutes ?? 60,
      notes: input.notes ?? null,
    })
    .returning();

  if (!inserted) throw new Error('Insert returned no row');

  return toScheduleItem(inserted, place);
}

export async function updateScheduleItem(
  userId: string,
  tripId: string,
  scheduleId: string,
  patch: UpdateScheduleItemInput,
): Promise<ScheduleItem> {
  await assertMember(userId, tripId);

  // Confirm the schedule row belongs to this trip before mutating it.
  const [existing] = await db
    .select()
    .from(tripScheduleItems)
    .where(and(eq(tripScheduleItems.id, scheduleId), eq(tripScheduleItems.trip_id, tripId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Schedule item not found');

  const updates: Partial<TripScheduleItem> = {};
  if (patch.dayIndex !== undefined) updates.day_index = patch.dayIndex;
  if (patch.startMinute !== undefined) updates.start_minute = patch.startMinute;
  if (patch.durationMinutes !== undefined) updates.duration_minutes = patch.durationMinutes;
  if (patch.notes !== undefined) updates.notes = patch.notes;

  if (Object.keys(updates).length === 0) {
    // Nothing to change — return the existing row with its place attached.
    const [place] = await db
      .select()
      .from(tripPlaces)
      .where(eq(tripPlaces.id, existing.trip_place_id))
      .limit(1);
    if (!place) throw new NotFoundError('Place not found');
    return toScheduleItem(existing, place);
  }

  const [updated] = await db
    .update(tripScheduleItems)
    .set(updates)
    .where(eq(tripScheduleItems.id, scheduleId))
    .returning();

  if (!updated) throw new Error('Update returned no row');

  const [place] = await db
    .select()
    .from(tripPlaces)
    .where(eq(tripPlaces.id, updated.trip_place_id))
    .limit(1);
  if (!place) throw new NotFoundError('Place not found');

  return toScheduleItem(updated, place);
}

export async function removeScheduleItem(
  userId: string,
  tripId: string,
  scheduleId: string,
): Promise<void> {
  await assertMember(userId, tripId);

  const [existing] = await db
    .select({ id: tripScheduleItems.id })
    .from(tripScheduleItems)
    .where(and(eq(tripScheduleItems.id, scheduleId), eq(tripScheduleItems.trip_id, tripId)))
    .limit(1);

  if (!existing) throw new NotFoundError('Schedule item not found');

  await db.delete(tripScheduleItems).where(eq(tripScheduleItems.id, scheduleId));
}

// Reserved for future role-gated mutations (e.g. only-owner reorder).
void ForbiddenError;
