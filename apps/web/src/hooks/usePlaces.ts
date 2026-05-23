import { useResource } from '@/hooks/useResource';
import { listPlaces } from '@/api/places';

export function useTripPlaces(tripId: string | undefined) {
  return useResource(
    () => {
      if (!tripId) throw new Error('Trip id is required');
      return listPlaces(tripId);
    },
    [tripId],
    { enabled: !!tripId },
  );
}
