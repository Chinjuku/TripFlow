import type { TripSummary } from '@/types/trips';

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
  range: string;
  duration: string;
}

export function formatDateRange(startIso: string, endIso: string): DateRangeDisplay {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);

  return {
    range: `${fmt(start)} - ${fmt(end)}`,
    duration: `${days} day${days === 1 ? '' : 's'}`,
  };
}

export function coverImageUrl(seed: string, width = 800, height = 450): string {
  const safeSeed = encodeURIComponent(seed);
  return `https://picsum.photos/seed/${safeSeed}/${width}/${height}`;
}

/* ------------------------------------------------------------------ */
/*  List filtering / sorting / grouping                               */
/* ------------------------------------------------------------------ */

/** Coarse buckets the trips toolbar filters by. */
export type TripFilter = 'all' | 'upcoming' | 'active' | 'past';
export type TripSort = 'soonest' | 'recent';

/** Maps the fine-grained status to the toolbar's coarse filter buckets. */
function matchesFilter(status: TripStatus, filter: TripFilter): boolean {
  switch (filter) {
    case 'all':
      return true;
    case 'active':
      return status === 'active';
    case 'past':
      return status === 'past';
    case 'upcoming':
      // Anything not yet started and not over: draft/planning/upcoming.
      return status === 'draft' || status === 'planning' || status === 'upcoming';
  }
}

/**
 * Applies the active filter + sort to a trip list.
 * `soonest` orders by start date ascending (next trip first); `recent` orders
 * by creation date descending (just-made first).
 */
export function filterAndSortTrips(
  trips: TripSummary[],
  filter: TripFilter,
  sort: TripSort,
  now: Date = new Date(),
): TripSummary[] {
  const filtered = trips.filter((t) => matchesFilter(deriveTripStatus(t, now), filter));
  return [...filtered].sort((a, b) => {
    if (sort === 'recent') return b.createdAt.localeCompare(a.createdAt);
    return a.startsOn.localeCompare(b.startsOn);
  });
}

/**
 * Splits trips into "upcoming" (not yet over) and "past" groups, each already
 * sorted: upcoming by soonest start, past by most-recent end.
 */
export function groupTripsByTime(
  trips: TripSummary[],
  now: Date = new Date(),
): { upcoming: TripSummary[]; past: TripSummary[] } {
  const upcoming: TripSummary[] = [];
  const past: TripSummary[] = [];
  for (const t of trips) {
    (deriveTripStatus(t, now) === 'past' ? past : upcoming).push(t);
  }
  upcoming.sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  past.sort((a, b) => b.endsOn.localeCompare(a.endsOn));
  return { upcoming, past };
}
