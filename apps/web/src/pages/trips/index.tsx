import { useMemo, useState } from 'react';
import { Plus, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import {
  useTrips,
  CreateTripDialog,
  JoinTripDialog,
  TripCard,
  TripsToolbar,
  TripsEmptyState,
  StartJourneyCard,
  TripListSkeleton,
  filterAndSortTrips,
  groupTripsByTime,
  type TripFilter,
  type TripSort,
  type TripSummary,
} from '@/components/feat/trips';

export default function TripsListPage() {
  const { data: trips, error, isLoading, refresh } = useTrips();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [filter, setFilter] = useState<TripFilter>('all');
  const [sort, setSort] = useState<TripSort>('soonest');
  const { t } = useTranslation();

  const loading = isLoading && trips === null;
  const allTrips = trips ?? [];

  const processed = useMemo(
    () => filterAndSortTrips(allTrips, filter, sort),
    [allTrips, filter, sort],
  );

  // Only group into Upcoming/Past when showing everything sorted by soonest —
  // an explicit filter or "recent" sort reads better as one flat grid.
  const grouped = useMemo(
    () => (filter === 'all' && sort === 'soonest' ? groupTripsByTime(processed) : null),
    [processed, filter, sort],
  );

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('trips.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{t('trips.subtitle')}</p>
        </div>
        {/* Hidden when there are no trips — the empty state offers Join itself. */}
        {!loading && allTrips.length > 0 && (
          <Button
            onClick={() => setJoinOpen(true)}
            className="hidden gap-2 self-start sm:inline-flex sm:self-auto"
          >
            <KeyRound className="h-4 w-4" strokeWidth={2} />
            {t('trips.joinUsingCode')}
          </Button>
        )}
      </header>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      )}

      {/* Toolbar only once there are trips to filter/sort. */}
      {!loading && allTrips.length > 0 && (
        <TripsToolbar
          filter={filter}
          onFilterChange={setFilter}
          sort={sort}
          onSortChange={setSort}
          count={processed.length}
        />
      )}

      {loading ? (
        <>
          {/* Toolbar placeholder — keeps the grid from jumping once loaded. */}
          <div className="flex items-center justify-between">
            <Skeleton className="h-9 w-64 rounded-xl" />
            <Skeleton className="h-5 w-28 rounded-md" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
            <TripListSkeleton count={6} />
          </div>
        </>
      ) : allTrips.length === 0 ? (
        <TripsEmptyState
          variant="none"
          onCreate={() => setCreateOpen(true)}
          onJoin={() => setJoinOpen(true)}
        />
      ) : processed.length === 0 ? (
        <TripsEmptyState
          variant="filtered"
          onCreate={() => setCreateOpen(true)}
          onJoin={() => setJoinOpen(true)}
        />
      ) : grouped ? (
        <div className="flex flex-col gap-8">
          <TripSection
            heading={t('trips.group.upcoming')}
            trips={grouped.upcoming}
            leading={<StartJourneyCard onClick={() => setCreateOpen(true)} />}
          />
          {grouped.past.length > 0 && (
            <TripSection heading={t('trips.group.past')} trips={grouped.past} />
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
          {processed.map((trip) => (
            <TripCard key={trip.id} trip={trip} />
          ))}
        </div>
      )}

      {/* Mobile FAB */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end gap-3 sm:hidden">
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          aria-label={t('trips.joinUsingCode')}
          className="bg-card text-foreground border-border focus-visible:ring-ring inline-flex h-12 w-12 items-center justify-center rounded-full border shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <KeyRound className="h-5 w-5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          aria-label={t('trips.startNewJourney')}
          className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-12 w-12 items-center justify-center rounded-full shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          <Plus className="h-5 w-5" strokeWidth={2.5} />
        </button>
      </div>

      <CreateTripDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={() => {
          setCreateOpen(false);
          void refresh();
        }}
      />
      <JoinTripDialog
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

interface TripSectionProps {
  heading: string;
  trips: TripSummary[];
  /** Optional card rendered before the trips (e.g. the create-trip tile). */
  leading?: React.ReactNode;
}

function TripSection({ heading, trips, leading }: TripSectionProps) {
  if (trips.length === 0 && !leading) return null;
  return (
    <section className="space-y-4">
      <h2 className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
        {heading}
      </h2>
      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        {leading}
        {trips.map((trip) => (
          <TripCard key={trip.id} trip={trip} />
        ))}
      </div>
    </section>
  );
}
