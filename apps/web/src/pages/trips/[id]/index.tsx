import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Map, Share2 } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { useTrip, formatDateRange } from '@/features/trips';
import { CollaboratorRow, TripBoardSkeleton, InviteModal } from '@/features/trips';
import { useAuth } from '@/features/auth/useAuth';

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

  if (!trip) {
    return <TripBoardSkeleton />;
  }

  const owner = trip.members.find((m) => m.role === 'owner');
  const ownerName = owner?.name ?? 'Unknown';
  const { range, duration } = formatDateRange(trip.startsOn, trip.endsOn);

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-8">
      {/* Workspace Navigation Header */}
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
            {ownerName}
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

      {/* Two columns: trip summary + collaborators */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <h3 className="text-foreground font-headline text-lg font-bold">Trip overview</h3>
          <div className="border-border bg-card rounded-2xl border p-6">
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Dates
                </dt>
                <dd className="text-foreground mt-1 text-base font-semibold">{range}</dd>
                <dd className="text-muted-foreground text-sm">{duration}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  Members
                </dt>
                <dd className="text-foreground mt-1 text-base font-semibold">
                  {trip.members.length}{' '}
                  {trip.members.length === 1 ? 'traveller' : 'travellers'}
                </dd>
              </div>
            </dl>

            <Link
              to={`/trips/${trip.id}/plan`}
              className="border-border hover:border-primary/40 hover:bg-muted/40 mt-6 flex items-center justify-between gap-3 rounded-xl border p-4 transition-colors"
            >
              <div>
                <p className="text-foreground text-sm font-semibold">Suggest & vote on places</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  Pick spots from the map and let your group rank them.
                </p>
              </div>
              <ArrowRight className="text-muted-foreground h-4 w-4 shrink-0" strokeWidth={2} />
            </Link>
          </div>
        </div>

        <div className="space-y-6">
          <h3 className="text-foreground font-headline text-lg font-bold">Board Collaborators</h3>
          <div className="border-border bg-card space-y-4 rounded-2xl border p-6">
            {trip.members.map((member) => (
              <CollaboratorRow
                key={member.userId}
                member={member}
                isCurrentUser={member.userId === user?.id}
              />
            ))}
          </div>
        </div>
      </div>
      <InviteModal open={inviteOpen} onOpenChange={setInviteOpen} trip={trip} />
    </div>
  );
}
