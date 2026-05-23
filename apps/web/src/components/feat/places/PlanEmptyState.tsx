import { ArrowRight, MapPinned, Sparkles } from 'lucide-react';
import { Button } from '@trip-flow/ui/components/button';
import type { PlanTab } from '@/types/places';

interface PlanEmptyStateProps {
  tab: PlanTab;
  onGoToPlan: () => void;
}

export function PlanEmptyState({ tab, onGoToPlan }: PlanEmptyStateProps) {
  if (tab === 'vote') {
    return (
      <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500">
        <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
          <Sparkles className="h-6 w-6" strokeWidth={1.75} />
        </div>
        <div className="space-y-1">
          <p className="text-foreground text-base font-bold">Nothing to vote on yet</p>
          <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
            Pick a few candidate places first — then come back here to rank them with your group.
          </p>
        </div>
        <Button onClick={onGoToPlan} size="sm" variant="outline" className="mt-2 gap-2">
          Add candidates
          <ArrowRight className="h-4 w-4" strokeWidth={2} />
        </Button>
      </div>
    );
  }
  return (
    <div className="border-border bg-card animate-in fade-in-0 slide-in-from-bottom-2 flex min-h-[20rem] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed p-8 text-center duration-500">
      <div className="bg-primary/10 text-primary flex h-12 w-12 items-center justify-center rounded-full">
        <MapPinned className="h-6 w-6" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <p className="text-foreground text-base font-bold">No places picked yet</p>
        <p className="text-muted-foreground mx-auto max-w-xs text-sm leading-relaxed">
          Tap any spot on the map (cafés, attractions, restaurants…) and add it as a candidate.
        </p>
      </div>
    </div>
  );
}
