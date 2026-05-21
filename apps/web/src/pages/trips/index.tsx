import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { useTrips } from '@/features/trips';
import {
  CreateTripDialog,
  JoinTripDialog,
  TripCard,
} from '@/features/trips/components';

export default function TripsListPage() {
  const { data: trips, error, isLoading, refresh } = useTrips();
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-headline text-foreground text-4xl font-extrabold tracking-tight">
            Your Group Trips
          </h1>
          <p className="text-muted-foreground mt-1">
            Plan, collaborate, and explore together.
          </p>
        </div>

        <Button onClick={() => setJoinOpen(true)} className="gap-2 self-start sm:self-auto">
          <Plus className="h-4 w-4" strokeWidth={2} />
          Join Trip Using Code
        </Button>
      </header>

      {error && (
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <StartJourneyCard onClick={() => setCreateOpen(true)} />

        {isLoading && trips === null
          ? [0, 1, 2].map((i) => <Skeleton key={i} className="h-[22rem] rounded-2xl" />)
          : (trips ?? []).map((trip) => <TripCard key={trip.id} trip={trip} />)}
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

function StartJourneyCard({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="border-border hover:border-primary/60 hover:bg-muted/40 focus-visible:ring-ring group flex h-full min-h-[22rem] flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-8 text-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
    >
      <div className="border-primary/40 text-primary group-hover:border-primary group-hover:bg-primary/5 flex h-14 w-14 items-center justify-center rounded-full border-2 transition-colors">
        <Plus className="h-6 w-6" strokeWidth={2} />
      </div>
      <h3 className="font-headline text-foreground text-xl font-bold leading-tight">
        Start a New
        <br />
        Journey
      </h3>
      <p className="text-muted-foreground max-w-[14rem] text-sm">
        Invite friends, vote on destinations, and plan together.
      </p>
    </button>
  );
}
