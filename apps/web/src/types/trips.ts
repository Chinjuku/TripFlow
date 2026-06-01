export interface TripMemberProfile {
  userId: string;
  role: 'owner' | 'member';
  joinedAt: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface TripSummary {
  id: string;
  title: string;
  startsOn: string;
  endsOn: string;
  inviteCode: string;
  isDebtOptimized: boolean;
  destinationName: string | null;
  centerLat: number | null;
  centerLng: number | null;
  role: 'owner' | 'member';
  createdAt: string;
  members: TripMemberProfile[];
}

export interface CreateTripPayload {
  title: string;
  startsOn: string;
  endsOn: string;
  destinationName?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
}

export interface UpdateTripPayload {
  title?: string;
  startsOn?: string;
  endsOn?: string;
  destinationName?: string | null;
  centerLat?: number | null;
  centerLng?: number | null;
}

export interface TripDetail extends TripSummary {
  ownerId: string;
}
