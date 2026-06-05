import { Skeleton } from '@/components/ui/skeleton';

/**
 * Loading placeholder for the trips grid. Each card mirrors the real TripCard
 * layout (cover, title, destination, date, member row) so the swap to loaded
 * content doesn't shift the layout.
 */
export function TripListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <TripCardSkeleton key={i} />
      ))}
    </>
  );
}

function TripCardSkeleton() {
  return (
    <div className="bg-card border-border flex h-full flex-col overflow-hidden rounded-2xl border shadow-sm">
      {/* Cover */}
      <Skeleton className="aspect-[16/10] w-full rounded-none sm:aspect-auto sm:h-44" />

      <div className="flex flex-1 flex-col gap-2.5 p-5 sm:p-4">
        {/* Title */}
        <Skeleton className="h-6 w-3/5" />
        {/* Destination row: pin + text */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3.5 w-2/5" />
        </div>
        {/* Date row: calendar + text */}
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-4 rounded-full" />
          <Skeleton className="h-3.5 w-1/2" />
        </div>

        {/* Footer: avatar stack + invite chip */}
        <div className="border-border/60 mt-auto flex items-center justify-between gap-3 border-t pt-3">
          <div className="flex -space-x-2">
            {[0, 1, 2].map((i) => (
              <Skeleton
                key={i}
                className="border-card h-8 w-8 rounded-full border-2 sm:h-7 sm:w-7"
              />
            ))}
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </div>
    </div>
  );
}
