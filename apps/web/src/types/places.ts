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
  stayMinutes?: number | null;
}

export type PlaceBucket = 'food' | 'cafe' | 'stay' | 'attraction' | 'bar' | 'shopping' | 'other';

export interface BucketMeta {
  id: PlaceBucket;
  label: string;
  plural: string;
  swatch: string;
}

export type FilterKey = 'all' | 'voted' | 'mine' | 'photos';
export type SortKey = 'votes' | 'name' | 'recent';
export type PlanTab = 'plan' | 'vote';
export type RankDelta = { kind: 'up' | 'down'; by: number } | { kind: 'new' };
