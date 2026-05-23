import { useResource } from './useResource';
import { getTrip, listTrips } from '@/api/trips';

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
