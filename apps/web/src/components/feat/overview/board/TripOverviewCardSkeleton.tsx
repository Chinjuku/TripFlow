import { Skeleton } from '@/components/ui/skeleton';

/** Loading placeholder for TripOverviewCard - hero band + two stat tiles. */
export function TripOverviewCardSkeleton() {
  return (
    <div className="border-border bg-card overflow-hidden rounded-2xl border">
      <div className="border-border bg-muted/30 flex items-center justify-between gap-3 border-b px-4 py-4 sm:px-6 sm:py-5">
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-6 w-20 rounded-full" />
      </div>
      <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div
            key={i}
            className="border-border bg-muted/30 flex items-start gap-3 rounded-xl border p-3"
          >
            <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
