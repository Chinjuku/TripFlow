import { useState } from 'react';
import { Clock, Heart, MapPin, Star, Trash2 } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { cn } from '@trip-flow/ui/lib/cn';
import { getInitials } from '@/components/feat/trips';
import { removePlace, setLike } from '@/api/places';
import { shortAddress } from '@/utils/places-map';
import type { TripPlace } from '@/types/places';
import { PlaceDetailModal } from './components/PlaceDetailModal';

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
  const [detailOpen, setDetailOpen] = useState(false);
  const viewDetails = () => setDetailOpen(true);

  return (
    <>
      {mode === 'vote' ? (
        <VoteCard
          place={place}
          tripId={tripId}
          addedByName={addedByName}
          addedByAvatarUrl={addedByAvatarUrl}
          onChange={onChange}
          onViewDetails={viewDetails}
        />
      ) : (
        <PlanCard
          place={place}
          tripId={tripId}
          canRemove={canRemove}
          onChange={onChange}
          onRemove={onRemove}
          onViewDetails={viewDetails}
        />
      )}
      <PlaceDetailModal
        open={detailOpen}
        onOpenChange={setDetailOpen}
        placeId={place.externalId}
        placeName={place.name}
      />
    </>
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
  onViewDetails,
}: {
  place: TripPlace;
  tripId: string;
  canRemove: boolean;
  onChange: (p: TripPlace) => void;
  onRemove: (id: string) => void;
  onViewDetails: () => void;
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
    // Soft UI Evolution: card carries its own subtle elevation + a hover
    // affordance so the row reads as a tappable item, not a static label.
    // Border stays transparent at rest and brightens to `border-primary/30`
    // on hover — keeps the surface calm but signals interactivity. Radius
    // matches the photo's (rounded-xl = 16px) so corners line up cleanly.
    <article
      className={cn(
        // Static card surface — no hover state on the row itself. The
        // green outline that appeared on hover felt out of place; the
        // interactive affordance lives on the inner vote chip + trash
        // button, where hover actually means something.
        'group/card border-border bg-card relative flex gap-3 rounded-xl border p-2.5 shadow-sm sm:gap-3.5 sm:p-3',
      )}
    >
      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt=""
          loading="lazy"
          className="bg-muted h-20 w-20 shrink-0 rounded-lg object-cover sm:h-24 sm:w-24"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-20 w-20 shrink-0 items-center justify-center rounded-lg sm:h-24 sm:w-24">
          <MapPin className="h-6 w-6" strokeWidth={1.75} />
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onViewDetails}
            className="min-w-0 text-left"
          >
            <h4 className="text-foreground hover:text-primary truncate text-sm font-semibold leading-tight transition-colors sm:text-[0.95rem]">
              {place.name}
            </h4>
          </button>
          <VoteChip count={place.voteCount} liked={place.liked} onClick={toggleLike} busy={busy} />
        </div>
        {place.address && (
          <p className="text-muted-foreground line-clamp-2 text-xs leading-snug sm:text-[0.8rem]">
            {place.address}
          </p>
        )}
        {/* Trash action — always visible (not hover-only) so the place's
            owner can see at a glance that the row is theirs to remove.
            `mt-auto` pins it to the bottom regardless of address length. */}
        {canRemove && (
          <div className="mt-auto flex justify-end">
            <button
              type="button"
              onClick={handleRemove}
              disabled={busy}
              aria-label="Remove place"
              className="text-muted-foreground hover:bg-destructive hover:text-destructive-foreground inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={2} />
            </button>
          </div>
        )}
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
  // Pill styled like a stat tag rather than a hard button so it reads as
  // "current state + tap to toggle". Filled primary when liked, neutral
  // ring when not — matches the calm hierarchy the rest of the card uses.
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? 'Unlike' : 'Like'}
      className={cn(
        'inline-flex h-6 shrink-0 items-center gap-1 rounded-full px-2 text-[0.7rem] font-semibold tabular-nums transition-all',
        liked
          ? 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm'
          : 'border-border text-muted-foreground hover:border-primary/40 hover:text-foreground border bg-transparent',
        'disabled:cursor-not-allowed disabled:opacity-50',
      )}
    >
      <Heart className={cn('h-3 w-3', liked && 'fill-current')} strokeWidth={2.25} />
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
  onViewDetails,
}: {
  place: TripPlace;
  tripId: string;
  addedByName?: string;
  addedByAvatarUrl?: string | null;
  onChange: (p: TripPlace) => void;
  onViewDetails: () => void;
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
    <article className="border-border bg-card flex flex-col overflow-hidden rounded-2xl border sm:h-48 sm:flex-row">
      {/* Left: photo with votes badge + rating badge. Fixed height so cards
          stay uniform regardless of photo aspect ratio. */}
      <div className="relative h-48 shrink-0 sm:h-full sm:w-56">
        {place.photoUrl ? (
          <img
            src={place.photoUrl}
            alt=""
            loading="lazy"
            className="bg-muted h-full w-full object-cover"
          />
        ) : (
          <div className="bg-muted text-muted-foreground flex h-full w-full items-center justify-center">
            <MapPin className="h-8 w-8" strokeWidth={1.5} />
          </div>
        )}

        {/* Votes badge — top-right of the photo */}
        <span className="bg-card/90 text-foreground absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur">
          <Heart
            className={cn('text-primary h-3.5 w-3.5', place.liked && 'fill-current')}
            strokeWidth={2}
          />
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
      <div className="flex min-w-0 flex-1 flex-col gap-3 overflow-hidden p-4 sm:p-5">
        <div className="min-w-0">
          <button
            type="button"
            onClick={onViewDetails}
            className="hover:text-primary block max-w-full text-left transition-colors"
          >
            <h4 className="text-foreground font-headline truncate text-lg font-bold leading-tight hover:text-primary sm:text-xl">
              {place.name}
            </h4>
          </button>
          {place.address && (
            <p className="text-muted-foreground mt-1 flex items-start gap-1.5 text-sm">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" strokeWidth={1.75} />
              <span className="line-clamp-2 min-w-0">{shortAddress(place.address)}</span>
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
              Selected by{' '}
              <span className="text-foreground font-medium">{addedByName ?? 'Member'}</span>
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
