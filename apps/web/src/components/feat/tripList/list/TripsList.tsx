import { useTranslation } from 'react-i18next';
import { Skeleton } from '@/components/ui/skeleton';
import type { TripSummary } from '@/types/trips';
import { StartJourneyCard } from './StartJourneyCard';
import { TripCard } from './TripCard';
import { TripListSkeleton } from './TripListSkeleton';
import { TripSection } from './TripSection';
import { TripsEmptyState } from './TripsEmptyState';

interface TripsListProps {
  /** All trips for this user - drives the empty-vs-filtered distinction. */
  total: number;
  /** Trips after filter + sort. */
  processed: TripSummary[];
  /** Upcoming/Past split, or null when a flat grid should be shown. */
  grouped: { upcoming: TripSummary[]; past: TripSummary[] } | null;
  loading: boolean;
  onCreate: () => void;
  onJoin: () => void;
}

/**
 * The trips grid and all of its states: loading skeletons, the empty and
 * filtered-empty states, the grouped Upcoming/Past view, and the flat grid.
 * Presentational - the page owns the filter/sort/group derivations so the
 * toolbar can share the same `processed` count.
 */
export function TripsList({
  total,
  processed,
  grouped,
  loading,
  onCreate,
  onJoin,
}: TripsListProps) {
  const { t } = useTranslation();

  if (loading) {
    return (
      <>
        {/* Toolbar placeholder - keeps the grid from jumping once loaded. */}
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-64 rounded-xl" />
          <Skeleton className="h-5 w-28 rounded-md" />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          <TripListSkeleton count={6} />
        </div>
      </>
    );
  }

  if (total === 0) {
    return <TripsEmptyState variant="none" onCreate={onCreate} onJoin={onJoin} />;
  }

  if (processed.length === 0) {
    return <TripsEmptyState variant="filtered" onCreate={onCreate} onJoin={onJoin} />;
  }

  if (grouped) {
    return (
      <div className="flex flex-col gap-8">
        <TripSection
          heading={t('trips.group.upcoming')}
          trips={grouped.upcoming}
          leading={<StartJourneyCard onClick={onCreate} />}
        />
        {grouped.past.length > 0 && (
          <TripSection heading={t('trips.group.past')} trips={grouped.past} />
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
      {processed.map((trip) => (
        <TripCard key={trip.id} trip={trip} />
      ))}
    </div>
  );
}
