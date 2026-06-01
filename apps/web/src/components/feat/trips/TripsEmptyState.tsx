import { Compass, KeyRound, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@trip-flow/ui/components/button';

interface TripsEmptyStateProps {
  /** `filtered` = list is empty only because of the active filter. */
  variant: 'none' | 'filtered';
  onCreate: () => void;
  onJoin: () => void;
}

/**
 * Full-width empty state for the trips grid. Two variants: no trips at all
 * (offers create + join), or nothing matching the current filter.
 */
export function TripsEmptyState({ variant, onCreate, onJoin }: TripsEmptyStateProps) {
  const { t } = useTranslation();
  const filtered = variant === 'filtered';

  return (
    <div className="border-border bg-muted/30 col-span-full flex flex-col items-center gap-4 rounded-2xl border border-dashed px-6 py-14 text-center">
      <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-2xl">
        <Compass className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="space-y-1">
        <h3 className="font-headline text-foreground text-lg font-bold">
          {t(filtered ? 'trips.emptyFilterTitle' : 'trips.emptyTitle')}
        </h3>
        <p className="text-muted-foreground max-w-sm text-sm">
          {t(filtered ? 'trips.emptyFilterDesc' : 'trips.emptyDesc')}
        </p>
      </div>
      {!filtered && (
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button onClick={onCreate} className="gap-2">
            <Plus className="h-4 w-4" strokeWidth={2.5} />
            {t('trips.startNewJourney')}
          </Button>
          <Button onClick={onJoin} variant="outline" className="gap-2">
            <KeyRound className="h-4 w-4" strokeWidth={2} />
            {t('trips.joinUsingCode')}
          </Button>
        </div>
      )}
    </div>
  );
}
