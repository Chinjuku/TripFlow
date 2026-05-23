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
  role: 'owner' | 'member';
  createdAt: string;
  members: TripMemberProfile[];
}

export interface CreateTripPayload {
  title: string;
  startsOn: string; // ISO datetime
  endsOn: string;
}

export interface TripDetail extends TripSummary {
  ownerId: string;
}
