import { useParams, Link } from 'react-router-dom';
import { Button } from '@trip-flow/ui/components/button';
import { ArrowLeft, Sparkles, Plus, Share2 } from 'lucide-react';
import { useTrip } from '@/features/trips';
import {
  CollaboratorRow,
  ItineraryCard,
  MapsDeepLink,
  TripBoardSkeleton,
} from '@/features/trips/components';
import { useAuth } from '@/features/auth/useAuth';

export default function TripBoardPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { data: trip, error } = useTrip(id);

  if (error) {
    return (
      <div className="mx-auto max-w-5xl">
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
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
          <div className="flex items-center gap-3">
            <h1 className="text-foreground font-headline text-3xl font-extrabold tracking-tight">
              {trip.title}
            </h1>
            <span className="bg-success/10 text-success border-success/20 inline-flex items-center gap-1 rounded border px-2 py-0.5 text-xs font-semibold">
              <span className="bg-success h-1.5 w-1.5 animate-pulse rounded-full" />
              Live Sync
            </span>
          </div>
          <p className="text-muted-foreground text-sm">
            Invite code: <span className="font-mono">{trip.inviteCode}</span> — Created by{' '}
            {ownerName}
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="gap-2">
            <Share2 className="h-4 w-4" />
            Invite
          </Button>
          <Button className="gap-2">
            <Sparkles className="h-4 w-4" />
            Optimize route
          </Button>
        </div>
      </div>

      {/* Columns: Itinerary + sidebar */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Daily Itinerary */}
        <div className="space-y-6 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="text-foreground font-headline text-lg font-bold">
              Daily Itinerary Staging
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {trip.items.length === 0 ? (
            <div className="border-border bg-card text-muted-foreground rounded-2xl border border-dashed p-10 text-center text-sm">
              No stops planned yet. Add your first destination to start building the route.
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {trip.items.map((item) => (
                <ItineraryCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
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

          <h3 className="text-foreground font-headline text-lg font-bold">Google Maps Deep Link</h3>
          <div className="border-primary/20 bg-primary/5 space-y-3 rounded-2xl border p-6">
            <p className="text-muted-foreground text-xs leading-relaxed">
              No API keys required. Standard Maps integrations automatically compile deep links to
              native mobile applications.
            </p>
            <MapsDeepLink items={trip.items} />
          </div>
        </div>
      </div>
    </div>
  );
}
