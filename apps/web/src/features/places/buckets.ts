/**
 * High-level groups that a candidate place falls into. Single source of
 * truth so the leaderboard, day-balance chart, and map podium all bucket
 * the same way — switching one without the others would surface
 * confusing "Top 3 cafés" lists that don't match the pie chart.
 *
 * Buckets are derived from Google Places' primary type. Anything that
 * doesn't match a curated rule falls into `other`.
 */
export type PlaceBucket = 'food' | 'cafe' | 'stay' | 'attraction' | 'bar' | 'shopping' | 'other';

export interface BucketMeta {
  id: PlaceBucket;
  /** Human-friendly singular label, e.g. "Restaurant". */
  label: string;
  /** Plural label used in headings / chart legends. */
  plural: string;
  /** Tailwind utility classes for the dot / bar in the day-balance chart. */
  swatch: string;
}

export const BUCKETS: Record<PlaceBucket, BucketMeta> = {
  food: { id: 'food', label: 'Restaurant', plural: 'food', swatch: 'bg-rose-400' },
  cafe: { id: 'cafe', label: 'Café', plural: 'cafés', swatch: 'bg-amber-400' },
  stay: { id: 'stay', label: 'Stay', plural: 'stays', swatch: 'bg-sky-400' },
  attraction: { id: 'attraction', label: 'Attraction', plural: 'attractions', swatch: 'bg-primary' },
  bar: { id: 'bar', label: 'Bar', plural: 'bars', swatch: 'bg-violet-400' },
  shopping: { id: 'shopping', label: 'Shopping', plural: 'shopping', swatch: 'bg-pink-400' },
  other: { id: 'other', label: 'Other', plural: 'other', swatch: 'bg-muted-foreground/40' },
};

/**
 * Maps a raw Google Places type (e.g. "coffee_shop") to one of our high-
 * level buckets. Order of checks matters: a "cafe" inside a "restaurant"
 * chain should still bucket as café, so café/bar/stay are tested before
 * the broader food/attraction rules.
 */
export function bucketFor(category: string | null | undefined): PlaceBucket {
  const c = (category ?? '').toLowerCase();
  if (!c) return 'other';
  if (/cafe|coffee/.test(c)) return 'cafe';
  if (/bar|pub|night_?club/.test(c)) return 'bar';
  if (/hotel|lodging|hostel|resort|motel|inn/.test(c)) return 'stay';
  if (/restaurant|food|meal|eat|dining/.test(c)) return 'food';
  if (/museum|landmark|temple|shrine|church|attraction|park|garden|monument|gallery/.test(c))
    return 'attraction';
  if (/shop|store|mall|market|boutique/.test(c)) return 'shopping';
  return 'other';
}
