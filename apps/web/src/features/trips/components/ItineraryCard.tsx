import { MapPin, MoreHorizontal } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import { getPlaceDescription, getPlaceName, type TripItem } from '@/features/trips';

export function ItineraryCard({ item }: { item: TripItem }) {
  const title = getPlaceName(item);
  const description = getPlaceDescription(item);

  return (
    <div className="border-border bg-card hover:border-primary/40 relative flex items-start gap-4 overflow-hidden rounded-2xl border p-5 transition-colors">
      <div className="border-primary/20 bg-primary/10 text-primary mt-1 flex h-6 w-6 items-center justify-center rounded-full border">
        <MapPin className="h-3.5 w-3.5" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-muted-foreground text-xs font-semibold">
            Day {item.dayIndex + 1} · Stop {item.position + 1}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-8 w-8"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
        <h4 className="text-foreground truncate text-base font-bold">{title}</h4>
        {description && <p className="text-muted-foreground mt-1 text-sm">{description}</p>}
      </div>
    </div>
  );
}
