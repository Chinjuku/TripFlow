import { useMemo } from 'react';
import { cn } from '@trip-flow/ui/lib/cn';
import { BUCKETS, bucketFor } from '@/utils/places';
import type { PlaceBucket } from '@/types/places';
import type { TripPlace } from '@/types/places';

interface CategoryTabsProps {
  active: PlaceBucket | 'all';
  onChange: (next: PlaceBucket | 'all') => void;
  available: Set<PlaceBucket>;
  places: TripPlace[];
}

export function CategoryTabs({ active, onChange, available, places }: CategoryTabsProps) {
  const counts = useMemo(() => {
    const out: Record<string, number> = { all: places.length };
    for (const p of places) {
      const b = bucketFor(p.category);
      out[b] = (out[b] ?? 0) + 1;
    }
    return out;
  }, [places]);

  const visible = (
    ['all', ...(Object.keys(BUCKETS) as PlaceBucket[]).filter((b) => available.has(b))] as Array<
      PlaceBucket | 'all'
    >
  ).map((id) => ({
    id,
    label: id === 'all' ? 'All' : BUCKETS[id].plural,
    swatch: id === 'all' ? null : BUCKETS[id].swatch,
    count: counts[id] ?? 0,
  }));

  return (
    <div
      role="tablist"
      aria-label="Filter by category"
      className="scrollbar-none -mx-1 flex shrink-0 items-center gap-1.5 overflow-x-auto px-1"
    >
      {visible.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(t.id)}
            className={cn(
              'inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold capitalize transition-all',
              isActive
                ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                : 'bg-card text-foreground border-border hover:border-primary/40 hover:bg-muted',
            )}
          >
            {t.swatch && <span className={cn('h-2 w-2 rounded-full', t.swatch)} aria-hidden />}
            {t.label}
            <span
              className={cn(
                'inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full px-1 text-[0.6rem] font-bold tabular-nums',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-muted text-muted-foreground',
              )}
            >
              {t.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}
