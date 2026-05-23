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
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'short', day: '2-digit' });

  const days = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );

  return {
    range: `${fmt(start)} - ${fmt(end)}`,
    duration: `${days} day${days === 1 ? '' : 's'}`,
  };
}

export function coverImageUrl(seed: string, width = 800, height = 450): string {
  const safeSeed = encodeURIComponent(seed);
  return `https://picsum.photos/seed/${safeSeed}/${width}/${height}`;
}
