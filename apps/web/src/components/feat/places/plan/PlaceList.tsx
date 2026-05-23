import { Check } from 'lucide-react';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { cn } from '@trip-flow/ui/lib/cn';
import { PlaceCard } from '../PlaceCard';
import type { TripPlace } from '@/types/places';

interface PlaceListProps {
  loading: boolean;
  places: TripPlace[];
  tripId: string;
  mode: 'plan' | 'vote';
  memberById: Map<string, { name: string; avatarUrl: string | null }>;
  currentUserId: string | undefined;
  hoveredId?: string | null;
  onHover?: (id: string | null) => void;
  registerCardRef?: (placeId: string, node: HTMLElement | null) => void;
  bulkMode?: boolean;
  bulkSelected?: Set<string>;
  onToggleSelect?: (placeId: string) => void;
  onChange: (p: TripPlace) => void;
  onRemove: (id: string) => void;
  emptyState: React.ReactNode;
}

export function PlaceList({
  loading,
  places,
  tripId,
  mode,
  memberById,
  currentUserId,
  hoveredId,
  onHover,
  registerCardRef,
  bulkMode,
  bulkSelected,
  onToggleSelect,
  onChange,
  onRemove,
  emptyState,
}: PlaceListProps) {
  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-28 rounded-2xl sm:h-44" />
        ))}
      </div>
    );
  }
  if (places.length === 0) {
    return <>{emptyState}</>;
  }
  return (
    <div className={cn(mode === 'vote' ? 'space-y-4' : 'space-y-3')}>
      {places.map((place) => {
        const adder = memberById.get(place.addedByUserId);
        const isHovered = hoveredId === place.id;
        const isSelected = bulkSelected?.has(place.id) ?? false;
        return (
          <div key={place.id}>
            <div
              ref={(node) => registerCardRef?.(place.id, node)}
              onMouseEnter={() => onHover?.(place.id)}
              onMouseLeave={() => onHover?.(null)}
              className={cn(
                'relative rounded-xl transition-all duration-200',
                isHovered && 'ring-primary/60 ring-2 ring-offset-2 ring-offset-background',
                isSelected && 'ring-primary ring-2 ring-offset-2 ring-offset-background',
              )}
            >
              {bulkMode && (
                <button
                  type="button"
                  onClick={() => onToggleSelect?.(place.id)}
                  aria-pressed={isSelected}
                  aria-label={isSelected ? 'Deselect' : 'Select'}
                  className={cn(
                    'absolute left-2 top-2 z-10 inline-flex h-6 w-6 items-center justify-center rounded-md border-2 shadow-sm transition-colors',
                    isSelected
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'bg-card border-border hover:border-primary',
                  )}
                >
                  {isSelected && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </button>
              )}
              <PlaceCard
                place={place}
                tripId={tripId}
                mode={mode}
                addedByName={adder?.name}
                addedByAvatarUrl={adder?.avatarUrl ?? null}
                canRemove={place.addedByUserId === currentUserId}
                onChange={onChange}
                onRemove={onRemove}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
