import { useResource } from '@/hooks/useResource';
import { listSchedule } from '@/api/schedule';

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
