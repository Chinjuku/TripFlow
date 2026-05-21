import type { TripItem, TripSummary } from './types';

interface PlaceShape {
  name?: string;
  description?: string;
  address?: string;
}

/** Trip items store the place as JSON — pull the human label out safely. */
export function getPlaceName(item: TripItem): string {
  const place = item.place as PlaceShape | null;
  return place?.name ?? `Stop ${item.position + 1}`;
}

/** Prefer the user's note over the structured description/address fallback. */
export function getPlaceDescription(item: TripItem): string | null {
  const place = item.place as PlaceShape | null;
  return item.notes ?? place?.description ?? place?.address ?? null;
}

/** Up to 2 uppercase initials, or '?' if the name has no letters. */
export function getInitials(name: string): string {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('')
      .slice(0, 2) || '?'
  );
}

export type TripStatus = 'draft' | 'planning' | 'upcoming' | 'active' | 'past';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Derives a status label from the trip's date window relative to today.
 * Pure: no DB column needed.
 */
export function deriveTripStatus(trip: TripSummary, now: Date = new Date()): TripStatus {
  const start = new Date(trip.startsOn);
  const end = new Date(trip.endsOn);
  const created = new Date(trip.createdAt);
  const daysUntilStart = Math.ceil((start.getTime() - now.getTime()) / DAY_MS);
  const daysSinceCreated = Math.floor((now.getTime() - created.getTime()) / DAY_MS);

  if (now > end) return 'past';
  if (now >= start && now <= end) return 'active';
  if (daysUntilStart <= 14) return 'upcoming';
  if (daysSinceCreated <= 2) return 'draft';
  return 'planning';
}

export interface DateRangeDisplay {
  range: string; // "Nov 05 - Nov 12"
  duration: string; // "8 days"
}

export function formatDateRange(startIso: string, endIso: string): DateRangeDisplay {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

  // Day count is inclusive of the start day.
  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );

  return {
    range: `${fmt(start)} - ${fmt(end)}`,
    duration: `${days} day${days === 1 ? '' : 's'}`,
  };
}

/**
 * Deterministic Lorem Picsum cover photo.
 *
 * Seeding by `trip.id` keeps the same photo across renders/devices, so a
 * trip's card looks consistent. Width/height match the card aspect ratio
 * so we don't ship oversized assets.
 *
 * @see https://picsum.photos
 */
export function coverImageUrl(seed: string, width = 800, height = 450): string {
  const safeSeed = encodeURIComponent(seed);
  return `https://picsum.photos/seed/${safeSeed}/${width}/${height}`;
}
