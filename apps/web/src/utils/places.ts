import type { BucketMeta, PlaceBucket } from '@/types/places';

export const BUCKETS = {
  food: { id: 'food', label: 'Restaurant', plural: 'Food', labelKey: 'common.bucket.food', pluralKey: 'common.bucket.foodPlural', swatch: 'bg-rose-400' },
  cafe: { id: 'cafe', label: 'Café', plural: 'Cafés', labelKey: 'common.bucket.cafe', pluralKey: 'common.bucket.cafePlural', swatch: 'bg-amber-400' },
  stay: { id: 'stay', label: 'Stay', plural: 'Stays', labelKey: 'common.bucket.stay', pluralKey: 'common.bucket.stayPlural', swatch: 'bg-sky-400' },
  attraction: { id: 'attraction', label: 'Attraction', plural: 'Attractions', labelKey: 'common.bucket.attraction', pluralKey: 'common.bucket.attractionPlural', swatch: 'bg-primary' },
  bar: { id: 'bar', label: 'Bar', plural: 'Bars', labelKey: 'common.bucket.bar', pluralKey: 'common.bucket.barPlural', swatch: 'bg-violet-400' },
  shopping: { id: 'shopping', label: 'Shopping', plural: 'Shopping', labelKey: 'common.bucket.shopping', pluralKey: 'common.bucket.shoppingPlural', swatch: 'bg-pink-400' },
  other: { id: 'other', label: 'Other', plural: 'Other', labelKey: 'common.bucket.other', pluralKey: 'common.bucket.otherPlural', swatch: 'bg-muted-foreground/40' },
} as const satisfies Record<PlaceBucket, BucketMeta>;

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

/**
 * Trims a Google formatted address to start at the sub-district, dropping the
 * house number / soi / road prefix that's too granular for a card. Matches the
 * Thai (ตำบล/แขวง/ต.) and English (Tambon/Khwaeng) markers; falls back to the
 * full string when no marker is found.
 */
export function shortAddress(address: string | null | undefined): string {
  if (!address) return '';
  const m = address.match(/(ตำบล|แขวง|ต\.|Tambon|Khwaeng)/);
  return m && m.index !== undefined ? address.slice(m.index).trim() : address;
}
