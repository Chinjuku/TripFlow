import type { OpeningPeriod } from '@/utils/places-map';

export type { OpeningPeriod };

export interface TripPlace {
  id: string;
  externalId: string;
  name: string;
  address: string | null;
  /** English snapshots; null on older rows. Render falls back to name/address. */
  nameEn: string | null;
  addressEn: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  rating: number | null;
  openingHoursText: string | null;
  /** Machine-readable weekly hours; null on older rows / unknown. */
  openingPeriods: OpeningPeriod[] | null;
  stayMinutes: number | null;
  addedByUserId: string;
  createdAt: string;
  voteCount: number;
  liked: boolean;
}

export interface AddPlacePayload {
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
  openingPeriods?: OpeningPeriod[] | null;
  stayMinutes?: number | null;
}

export type PlaceBucket = 'food' | 'cafe' | 'stay' | 'attraction' | 'bar' | 'shopping' | 'other';

export interface BucketMeta {
  id: PlaceBucket;
  /** English fallback; prefer `labelKey`/`pluralKey` with t() for display. */
  label: string;
  plural: string;
  /** i18n keys (under common.bucket) for the singular + plural label. */
  labelKey: string;
  pluralKey: string;
  swatch: string;
}

export type FilterKey = 'all' | 'voted' | 'mine' | 'photos';
export type SortKey = 'votes' | 'name' | 'recent';
export type PlanTab = 'plan' | 'vote';

export interface PlanTabMeta {
  id: PlanTab;
  label: string;
  heading: string;
  helper: string;
  /** Count shown as a pill next to the label (e.g. picked places / voted). */
  count: number;
}

export type RankDelta = { kind: 'up' | 'down'; by: number } | { kind: 'new' };
