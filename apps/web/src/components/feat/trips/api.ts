import { api } from '@/lib/api';
import type { CreateTripPayload, TripDetail, TripSummary } from '@/types/trips';

/**
 * Thin wrappers around the Eden client so React components don't have to
 * know the Elysia route shape. Each call surfaces network/HTTP errors as
 * thrown Error objects so callers can `try/catch` uniformly.
 */

function unwrap<T>(value: { data: T | null; error: unknown }): T {
  if (value.error) {
    const message =
      typeof value.error === 'object' && value.error !== null && 'message' in value.error
        ? String((value.error as { message: unknown }).message)
        : 'Request failed';
    throw new Error(message);
  }
  if (value.data === null) {
    throw new Error('Empty response');
  }
  return value.data;
}

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
