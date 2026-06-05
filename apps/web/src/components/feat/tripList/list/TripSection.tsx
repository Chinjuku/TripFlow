import type { ReactNode } from 'react';
import type { TripSummary } from '@/types/trips';
import { TripCard } from './TripCard';

interface TripSectionProps {
  heading: string;
  trips: TripSummary[];
  /** Optional card rendered before the trips (e.g. the create-trip tile). */
  leading?: ReactNode;
}

/** A labelled grid of trips (e.g. Upcoming / Past). Renders nothing when empty. */
export function TripSection({ heading, trips, leading }: TripSectionProps) {
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
