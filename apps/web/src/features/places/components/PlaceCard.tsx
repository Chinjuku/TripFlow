import { useState } from 'react';
import { Clock, Heart, MapPin, Star, Trash2 } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import { getInitials } from '@/features/trips';
import { removePlace, setLike, type TripPlace } from '@/features/places';

interface PlaceCardProps {
  place: TripPlace;
  tripId: string;
  /**
   * `plan` — list/manage view: no like button, shows vote count as a chip.
   * `vote` — voting view: image-left layout with prominent Vote button.
   */
  mode: 'plan' | 'vote';
  /** Display info for whoever added this place — used for the "Selected by" row. */
  addedByName?: string;
  addedByAvatarUrl?: string | null;
  /** Whether the current user owns this pick (controls Delete affordance). */
  canRemove: boolean;
  onChange: (place: TripPlace) => void;
  onRemove: (placeId: string) => void;
}

export function PlaceCard({
  place,
  tripId,
  mode,
  addedByName,
  addedByAvatarUrl,
  canRemove,
  onChange,
  onRemove,
}: PlaceCardProps) {
  if (mode === 'vote') {
    return (
      <VoteCard
        place={place}
        tripId={tripId}
        addedByName={addedByName}
        addedByAvatarUrl={addedByAvatarUrl}
        onChange={onChange}
      />
    );
  }
  return (
    <PlanCard
      place={place}
      tripId={tripId}
      canRemove={canRemove}
      onChange={onChange}
      onRemove={onRemove}
    />
  );
}

/* -------------------------------------------------------------------------- */
/*  Plan (manage) view                                                        */
/* -------------------------------------------------------------------------- */

function PlanCard({
  place,
  tripId,
  canRemove,
  onChange,
  onRemove,
}: {
  place: TripPlace;
  tripId: string;
  canRemove: boolean;
  onChange: (p: TripPlace) => void;
  onRemove: (id: string) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    setBusy(true);
    try {
      const updated = await setLike(tripId, place.id, !place.liked);
      onChange(updated);
    } catch {
      // surfaced via next refresh
    } finally {
      setBusy(false);
    }
  }

  async function handleRemove() {
    if (!confirm(`Remove "${place.name}" from this trip?`)) return;
    setBusy(true);
    try {
      await removePlace(tripId, place.id);
      onRemove(place.id);
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border-border bg-card flex gap-3 rounded-2xl border p-3 sm:gap-4 sm:p-4">
      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt=""
          loading="lazy"
          className="bg-muted h-20 w-20 shrink-0 rounded-xl object-cover sm:h-24 sm:w-24"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-20 w-20 shrink-0 items-center justify-center rounded-xl sm:h-24 sm:w-24">
          <MapPin className="h-6 w-6" strokeWidth={1.75} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-foreground truncate text-sm font-bold sm:text-base">{place.name}</h4>
          <VoteChip count={place.voteCount} liked={place.liked} onClick={toggleLike} busy={busy} />
        </div>
        {place.address && (
          <p className="text-muted-foreground mt-0.5 line-clamp-2 text-xs sm:text-sm">
            {place.address}
          </p>
        )}
        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {place.category && (
            <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-wide">
              {place.category}
            </span>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              aria-label="Remove place"
              className="text-muted-foreground hover:text-destructive ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function VoteChip({
  count,
  liked,
  onClick,
  busy,
}: {
  count: number;
  liked: boolean;
  onClick: () => void;
  busy: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold transition-colors',
        liked
          ? 'bg-primary/10 text-primary'
          : 'bg-muted text-muted-foreground hover:bg-muted/70',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <Heart className={cn('h-3 w-3', liked && 'fill-current')} strokeWidth={2} />
      {count}
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/*  Vote view (matches the ref design)                                        */
/* -------------------------------------------------------------------------- */

function VoteCard({
  place,
  tripId,
  addedByName,
  addedByAvatarUrl,
  onChange,
}: {
  place: TripPlace;
  tripId: string;
  addedByName?: string;
  addedByAvatarUrl?: string | null;
  onChange: (p: TripPlace) => void;
}) {
  const [busy, setBusy] = useState(false);

  async function toggleLike() {
    setBusy(true);
    try {
      const updated = await setLike(tripId, place.id, !place.liked);
      onChange(updated);
    } catch {
      // surfaced via next refresh
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border sm:flex-row">
      {/* Left: photo with votes badge + rating badge */}
      <div className="relative shrink-0">
        {place.photoUrl ? (
          <img
            src={place.photoUrl}
            alt=""
            loading="lazy"
            className="bg-muted h-48 w-full object-cover sm:h-full sm:w-56"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-48 w-full items-center justify-center sm:h-full sm:w-56">
            <MapPin className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}

        {/* Votes badge — top-right of the photo */}
        <span className="bg-card/90 text-foreground absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          <Heart className={cn('text-primary h-3.5 w-3.5', place.liked && 'fill-current')} strokeWidth={2} />
          {place.voteCount} {place.voteCount === 1 ? 'Vote' : 'Votes'}
        </span>

        {/* Rating — bottom-left of the photo */}
        {place.rating !== null && (
          <span className="bg-card/90 text-foreground absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm backdrop-blur">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={2} />
            {place.rating.toFixed(1)}
          </span>
        )}
      </div>

      {/* Right: details */}
      <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
        <div className="min-w-0">
          <h4 className="text-foreground font-headline truncate text-lg font-bold leading-tight sm:text-xl">
            {place.name}
          </h4>
          {place.address && (
            <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="line-clamp-2 min-w-0">{place.address}</span>
            </p>
          )}
        </div>

        {/* Info pills */}
        {place.openingHoursText && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs">
              <Clock className="h-3 w-3" strokeWidth={2} />
              {place.openingHoursText}
            </span>
          </div>
        )}

        {/* Bottom row: added-by + Vote button */}
        <div className="border-border mt-auto flex items-center justify-between gap-2 border-t pt-3">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            {addedByAvatarUrl ? (
              <img
                src={addedByAvatarUrl}
                alt=""
                referrerPolicy="no-referrer"
                className="bg-muted h-7 w-7 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="bg-primary/10 text-primary inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold">
                {getInitials(addedByName ?? '?')}
              </span>
            )}
            <span className="text-muted-foreground min-w-0 truncate text-xs">
              Selected by <span className="text-foreground font-medium">{addedByName ?? 'Member'}</span>
            </span>
          </div>

          <Button
            type="button"
            onClick={toggleLike}
            disabled={busy}
            variant={place.liked ? 'outline' : 'default'}
            size="sm"
            className="shrink-0 gap-2"
          >
            <Heart className={cn('h-4 w-4', place.liked && 'fill-current')} strokeWidth={2} />
            {place.liked ? 'Voted' : 'Vote'}
          </Button>
        </div>
      </div>
    </article>
  );
}

function formatStay(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`;
}
