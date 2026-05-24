import type { BucketMeta, PlaceBucket } from '@/types/places';

export const BUCKETS: Record<PlaceBucket, BucketMeta> = {
  food: { id: 'food', label: 'Restaurant', plural: 'food', swatch: 'bg-rose-400' },
  cafe: { id: 'cafe', label: 'Café', plural: 'cafés', swatch: 'bg-amber-400' },
  stay: { id: 'stay', label: 'Stay', plural: 'stays', swatch: 'bg-sky-400' },
  attraction: {
    id: 'attraction',
    label: 'Attraction',
    plural: 'attractions',
    swatch: 'bg-primary',
  },
  bar: { id: 'bar', label: 'Bar', plural: 'bars', swatch: 'bg-violet-400' },
  shopping: { id: 'shopping', label: 'Shopping', plural: 'shopping', swatch: 'bg-pink-400' },
  other: { id: 'other', label: 'Other', plural: 'other', swatch: 'bg-muted-foreground/40' },
};

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
