import { api } from '@/lib/api';
import { unwrap } from '@/lib/unwrap';
import type {
  CreateTripPayload,
  UpdateTripPayload,
  TripDetail,
  TripSummary,
} from '@/types/trips';

export async function listTrips(): Promise<TripSummary[]> {
  const res = await api.trips.get();
  const { trips } = unwrap(res) as { trips: TripSummary[] };
  return trips;
}

export async function createTrip(payload: CreateTripPayload): Promise<TripSummary> {
  const res = await api.trips.post(payload);
  const { trip } = unwrap(res) as { trip: TripSummary };
  return trip;
}

export async function joinTrip(inviteCode: string): Promise<TripSummary> {
  const res = await api.trips.join.post({ inviteCode });
  const { trip } = unwrap(res) as { trip: TripSummary };
  return trip;
}

export async function getTrip(id: string): Promise<TripDetail> {
  const res = await api.trips[id]!.get();
  const { trip } = unwrap(res) as { trip: TripDetail };
  return trip;
}

export async function updateTrip(id: string, payload: UpdateTripPayload): Promise<TripSummary> {
  const res = await api.trips[id]!.patch(payload);
  const { trip } = unwrap(res) as { trip: TripSummary };
  return trip;
}

export async function deleteTrip(id: string): Promise<void> {
  const res = await api.trips[id]!.delete();
  unwrap(res);
}

export async function removeTripMember(id: string, userId: string): Promise<void> {
  const res = await api.trips[id]!.members[userId]!.delete();
  unwrap(res);
}
