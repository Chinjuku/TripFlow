import { useResource } from '@/hooks/useResource';
import { getFinances } from '@/api/finances';

/**
 * Loads financial summary, expenses, settlements, budgets, and member details.
 * Re-runs fetcher whenever tripId or optimized changes.
 */
export function useTripFinances(tripId: string | undefined, optimized: boolean) {
  return useResource(
    () => {
      if (!tripId) throw new Error('Trip id is required');
      return getFinances(tripId, optimized);
    },
    [tripId, optimized],
    { enabled: !!tripId },
  );
}
