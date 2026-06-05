import { Skeleton } from '@/components/ui/skeleton';
import { HOURS_END, HOURS_START, HOUR_HEIGHT_PX, TIMELINE_HEIGHT_PX } from '@/utils/schedule';

/**
 * Per-section loading placeholders for the schedule page. Each mirrors the
 * real component's shape so sections can swap skeleton→content independently
 * (progressive loading) without a layout jump.
 */

const GHOSTS = [
  { top: 9 * HOUR_HEIGHT_PX, height: 1.5 * HOUR_HEIGHT_PX },
  { top: 11.5 * HOUR_HEIGHT_PX, height: HOUR_HEIGHT_PX },
  { top: 14 * HOUR_HEIGHT_PX, height: 2 * HOUR_HEIGHT_PX },
];

/** Timeline: the hour grid + a few ghost event blocks at plausible positions. */
export function TimelineSkeleton() {
  const hourLines = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);

  return (
    <div className="relative ml-10 sm:ml-12" style={{ height: TIMELINE_HEIGHT_PX }} aria-hidden>
      {hourLines.map((h, idx) => (
        <div
          key={h}
          className="absolute inset-x-0 flex items-start"
          style={{ top: idx * HOUR_HEIGHT_PX }}
        >
          <span className="bg-muted absolute -left-10 h-2.5 w-7 -translate-y-1/2 rounded sm:-left-12" />
          <div className="border-border/60 w-full border-t" />
        </div>
      ))}

      {GHOSTS.map((g, i) => (
        <Skeleton
          key={i}
          className="absolute left-2 right-2 rounded-lg"
          style={{ top: g.top, height: g.height }}
        />
      ))}
    </div>
  );
}

/** Stacked day-tab pills (two-line), spread to fill the row width. */
export function DayTabsSkeleton() {
  return (
    <div className="flex gap-2" aria-hidden>
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-card flex min-w-0 flex-1 flex-col gap-1.5 rounded-xl border px-3.5 py-2"
        >
          <Skeleton className="h-2 w-8 rounded" />
          <Skeleton className="h-3.5 w-12 rounded" />
        </div>
      ))}
    </div>
  );
}

/** Route-flow strip: step cards joined by connectors, filling the row width. */
export function RouteFlowSkeleton() {
  return (
    <div className="border-border bg-card rounded-2xl border p-3 sm:p-4" aria-hidden>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-3.5 w-24 rounded" />
          <Skeleton className="h-4 w-12 rounded-full" />
        </div>
        <Skeleton className="hidden h-4 w-28 rounded sm:block" />
      </div>
      <div className="flex items-center gap-1">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex min-w-0 flex-1 items-center gap-1">
            <Skeleton className="h-[3.75rem] min-w-0 flex-1 rounded-xl" />
            {i < 2 && <Skeleton className="h-2 w-6 shrink-0 rounded-full" />}
          </div>
        ))}
      </div>
    </div>
  );
}

/** Voted-places list in the sidebar (one column on lg, two on sm). */
export function PlaceListSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-1" aria-hidden>
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="border-border bg-card flex items-start gap-3 rounded-xl border p-3"
        >
          <Skeleton className="h-12 w-12 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4 rounded" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
