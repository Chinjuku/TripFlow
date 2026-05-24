import { useState } from 'react';
import { Plus, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';
import {
  useTrips,
  CreateTripDialog,
  JoinTripDialog,
  TripCard,
  StartJourneyCard,
  TripListSkeleton,
} from '@/components/feat/trips';

export default function TripsListPage() {
  const { data: trips, error, isLoading, refresh } = useTrips();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div>
          <h1 className="font-headline text-foreground text-3xl font-extrabold tracking-tight sm:text-4xl">
            {t('trips.title')}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {t('trips.subtitle')}
          </p>
        </div>
        <Button
          onClick={() => setJoinOpen(true)}
          className="hidden gap-2 self-start sm:inline-flex sm:self-auto"
        >
          <KeyRound className="h-4 w-4" strokeWidth={2} />
          {t('trips.joinUsingCode')}
        </Button>
      </header>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2 lg:grid-cols-3">
        <StartJourneyCard onClick={() => setCreateOpen(true)} />
        {isLoading && trips === null
          ? <TripListSkeleton />
          : (trips ?? []).map((trip) => <TripCard key={trip.id} trip={trip} />)}
      </div>

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
        onCreated={() => { setCreateOpen(false); void refresh(); }}
      />
      <JoinTripDialog
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={() => { setJoinOpen(false); void refresh(); }}
      />
    </div>
  );
}
