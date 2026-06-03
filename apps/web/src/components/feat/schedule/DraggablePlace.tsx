import { ArrowUp, MapPin } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';
import { localized } from '@/utils/places-map';
import type { TripPlace } from '@/types/places';
import type { DragPayload } from '@/types/schedule';

export function DraggablePlace({ place }: { place: TripPlace }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `place-${place.id}`,
    data: { kind: 'new', tripPlaceId: place.id } satisfies DragPayload,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'border-border bg-card relative flex cursor-grab items-start gap-3 rounded-xl border p-3 transition-shadow',
        'hover:border-primary/40 hover:shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <PlacePill place={place} />
    </div>
  );
}

export function PlacePill({ place, dragging }: { place: TripPlace; dragging?: boolean }) {
  const { i18n } = useTranslation();
  const displayName = localized(i18n.language, place.name, place.nameEn) ?? place.name;
  return (
    <>
      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt=""
          loading="lazy"
          className="bg-muted h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
          <MapPin className="h-4 w-4" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-foreground truncate text-sm font-semibold">{displayName}</p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold',
              place.voteCount > 0 ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground',
            )}
          >
            <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
            {place.voteCount}
          </span>
        </div>
        {place.openingHoursText && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">{place.openingHoursText}</p>
        )}
      </div>
      {dragging && (
        <div
          aria-hidden
          className="bg-card border-primary absolute inset-0 -m-px rounded-xl border-2 shadow-lg"
        />
      )}
    </>
  );
}
