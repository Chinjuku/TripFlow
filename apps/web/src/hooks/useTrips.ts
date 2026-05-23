import { useResource } from './useResource';
import { getTrip, listTrips } from '@/components/feat/trips/api';

export function useTrips() {
  return useResource(() => listTrips(), []);
}

export function useTrip(id: string | undefined) {
  return useResource(
    () => {
      if (!id) throw new Error('Trip id is required');
      return getTrip(id);
    },
    [id],
    { enabled: !!id },
  );
}
