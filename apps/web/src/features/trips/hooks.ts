import { useResource } from '@/lib/useResource';
import { getTrip, listTrips } from './api';

/**
 * Loads every trip the current user is a member of.
 *
 * Returns the same shape as useResource — `data` is `null` until the first
 * response arrives. Call `refresh()` after a create/join to repopulate.
 */
export function useTrips() {
  return useResource(() => listTrips(), []);
}

/**
 * Loads a single trip detail (with items + members).
 *
 * The fetcher is disabled when `id` is undefined so the hook can be called
 * unconditionally — useful in pages where `useParams()` may return undefined
 * during the first render.
 */
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
