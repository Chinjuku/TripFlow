import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Map, Share2 } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { useAuth } from '@/hooks/useAuth';
import { useTrip } from '@/components/feat/trips';
import {
  TripBoardSkeleton,
  InviteModal,
  TripOverviewCard,
  CollaboratorsPanel,
  TripPlacesSummaryCard,
} from '@/components/feat/overview';

export default function TripBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: trip, error } = useTrip(id);
  const [inviteOpen, setInviteOpen] = useState(false);

  if (error) {
    return (
      <div className="mx-auto max-w-6xl">
        <Link
          to="/trips"
          className="text-muted-foreground hover:text-primary mb-6 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          All trips
        </Link>
        <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
          {error.message}
        </div>
      </div>
    );
  }

  if (!trip) return <TripBoardSkeleton />;

  const owner = trip.members.find((m) => m.role === 'owner');

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <Link
            to="/trips"
            className="text-muted-foreground hover:text-primary mb-2 inline-flex items-center gap-2 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            All trips
          </Link>
          <h1 className="text-foreground font-headline text-3xl font-extrabold tracking-tight">
            {trip.title}
          </h1>
          <p className="text-muted-foreground text-sm">
            Invite code: <span className="font-mono">{trip.inviteCode}</span> — Created by{' '}
            {owner?.name ?? 'Unknown'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2" onClick={() => setInviteOpen(true)}>
            <Share2 className="h-4 w-4" />
            Invite
          </Button>
          <Link
            to={`/trips/${trip.id}/plan`}
            className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible:ring-ring inline-flex h-10 items-center gap-2 rounded-md px-4 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          >
            <Map className="h-4 w-4" />
            Plan places
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3 lg:h-[calc(100vh-14rem)] lg:overflow-hidden">
        <div className="space-y-6 lg:col-span-2 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
          <h3 className="text-foreground font-headline text-lg font-bold shrink-0">Trip overview</h3>
          <div className="shrink-0">
            <TripOverviewCard trip={trip} />
          </div>
          <TripPlacesSummaryCard trip={trip} className="lg:flex-1 lg:overflow-hidden" />
        </div>
        <div className="space-y-6 lg:h-full lg:flex lg:flex-col lg:overflow-hidden">
          <h3 className="text-foreground font-headline text-lg font-bold shrink-0">Board Collaborators</h3>
          <div className="lg:flex-1 lg:overflow-y-auto pr-1 -mr-1 scrollbar-none">
            <CollaboratorsPanel members={trip.members} currentUserId={user?.id} />
          </div>
        </div>
      </div>

      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} trip={trip} />
    </div>
  );
}
