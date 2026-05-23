import { useResource } from '@/hooks/useResource';
import { listPlaces } from './api';

/**
 * Loads candidate places for a trip sorted by vote score.
 *
 * The fetcher is disabled when `tripId` is missing so the hook can be
 * called unconditionally during the first render.
 */
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
