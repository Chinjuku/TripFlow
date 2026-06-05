import { useMemo, useState } from 'react';
import {
  useTrips,
  CreateTripModal,
  JoinTripModal,
  TripsHeader,
  TripsToolbar,
  TripsList,
  TripsMobileFab,
  filterAndSortTrips,
  groupTripsByTime,
  type TripFilter,
  type TripSort,
} from '@/components/feat/tripList';

export default function TripsListPage() {
  const { data: trips, error, isLoading, refresh } = useTrips();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [filter, setFilter] = useState<TripFilter>('all');
  const [sort, setSort] = useState<TripSort>('soonest');

  const loading = isLoading && trips === null;
  const allTrips = trips ?? [];
  const hasTrips = !loading && allTrips.length > 0;

  const processed = useMemo(
    () => filterAndSortTrips(allTrips, filter, sort),
    [allTrips, filter, sort],
  );

  // Only group into Upcoming/Past when showing everything sorted by soonest -
  // an explicit filter or "recent" sort reads better as one flat grid.
  const grouped = useMemo(
    () => (filter === 'all' && sort === 'soonest' ? groupTripsByTime(processed) : null),
    [processed, filter, sort],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      <TripsHeader showJoin={hasTrips} onJoin={() => setJoinOpen(true)} />

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      )}

      {hasTrips && (
        <TripsToolbar
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          count={processed.length}
        />
      )}

      <TripsList
        total={allTrips.length}
        processed={processed}
        grouped={grouped}
        loading={loading}
        onCreate={() => setCreateOpen(true)}
        onJoin={() => setJoinOpen(true)}
      />

      <TripsMobileFab onCreate={() => setCreateOpen(true)} onJoin={() => setJoinOpen(true)} />

      <CreateTripModal
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          void refresh();
        }}
      />
      <JoinTripModal
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={() => {
          setJoinOpen(false);
          void refresh();
        }}
      />
    </div>
  );
}
