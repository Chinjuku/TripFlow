import { api } from '@/lib/api';
import { unwrap } from '@/lib/unwrap';
import type { AddPlacePayload, TripPlace } from '@/types/places';

export async function listPlaces(tripId: string): Promise<TripPlace[]> {
  const res = await api.trips[tripId]!.places.get();
  const { places } = unwrap(res) as { places: TripPlace[] };
  return places;
}

export async function addPlace(tripId: string, payload: AddPlacePayload): Promise<TripPlace> {
  const res = await api.trips[tripId]!.places.post(payload);
  const { place } = unwrap(res) as { place: TripPlace };
  return place;
}

export async function removePlace(tripId: string, placeId: string): Promise<void> {
  const res = await api.trips[tripId]!.places[placeId]!.delete();
  unwrap(res);
}

export async function setLike(tripId: string, placeId: string, liked: boolean): Promise<TripPlace> {
  const res = await api.trips[tripId]!.places[placeId]!.like.put({ liked });
  const { place } = unwrap(res) as { place: TripPlace };
  return place;
}
