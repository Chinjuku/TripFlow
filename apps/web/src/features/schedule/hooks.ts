import { useResource } from '@/lib/useResource';
import { listSchedule } from './api';

/**
 * Loads every scheduled item for a trip across all days. Single fetch
 * keeps day-switching instant — the page filters in memory.
 */
export function useSchedule(tripId: string | undefined) {
  return useResource(
    () => {
      if (!tripId) throw new Error('Trip id is required');
      return listSchedule(tripId);
    },
    [tripId],
    { enabled: !!tripId },
  );
}
