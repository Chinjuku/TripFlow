import { ArrowDownWideNarrow } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@trip-flow/ui/lib/cn';
import type { TripFilter, TripSort } from '@/utils/trips';

const FILTERS = [
  { id: 'all', labelKey: 'trips.filter.all' },
  { id: 'upcoming', labelKey: 'trips.filter.upcoming' },
  { id: 'active', labelKey: 'trips.filter.active' },
  { id: 'past', labelKey: 'trips.filter.past' },
] as const satisfies readonly { id: TripFilter; labelKey: string }[];

interface TripsToolbarProps {
  filter: TripFilter;
  onFilterChange: (filter: TripFilter) => void;
  sort: TripSort;
  onSortChange: (sort: TripSort) => void;
  /** Number of trips after filtering - shown as a count. */
  count: number;
}

/**
 * Filter pills + a sort toggle for the trips list. Filters map to the coarse
 * status buckets in `utils/trips`; sort flips between soonest-start and
 * recently-added.
 */
export function TripsToolbar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  count,
}: TripsToolbarProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="border-border bg-muted/50 flex gap-1 self-start rounded-xl border p-1">
        {FILTERS.map(({ id, labelKey }) => {
          const isActive = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => onFilterChange(id)}
              aria-pressed={isActive}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
                isActive
                  ? 'bg-card text-foreground border-border/40 border shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t(labelKey)}
            </button>
          );
        })}
      </div>

      <div className="text-muted-foreground flex items-center gap-3 text-sm">
        <span className="tabular-nums">{t('trips.tripCount', { count })}</span>
        <button
          type="button"
          onClick={() => onSortChange(sort === 'soonest' ? 'recent' : 'soonest')}
          className="hover:text-foreground inline-flex items-center gap-1.5 font-medium transition-colors"
        >
          <ArrowDownWideNarrow className="h-4 w-4" strokeWidth={1.75} />
          {t(sort === 'soonest' ? 'trips.sort.soonest' : 'trips.sort.recent')}
        </button>
      </div>
    </div>
  );
}
