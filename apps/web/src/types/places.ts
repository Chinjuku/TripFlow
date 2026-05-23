export interface TripPlace {
  id: string;
  externalId: string;
  name: string;
  address: string | null;
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
  category?: string | null;
  lat?: number | null;
  lng?: number | null;
  photoUrl?: string | null;
  rating?: number | null;
  openingHoursText?: string | null;
  stayMinutes?: number | null;
}

export type FilterKey = 'all' | 'voted' | 'mine' | 'photos';
export type SortKey = 'votes' | 'name' | 'recent';
export type PlanTab = 'plan' | 'vote';
export type RankDelta = { kind: 'up' | 'down'; by: number } | { kind: 'new' };
