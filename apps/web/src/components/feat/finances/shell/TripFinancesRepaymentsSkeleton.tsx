import { Skeleton } from '@/components/ui/skeleton';

export function TripFinancesRepaymentsSkeleton() {
  return (
    <div className="space-y-6 flex flex-col flex-1 animate-pulse">
      {/* Banner skeleton */}
      <Skeleton className="h-32 rounded-2xl w-full shrink-0" />

      {/* List header skeleton */}
      <Skeleton className="h-6 w-1/3 max-w-[12rem] shrink-0" />

      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-card border border-border rounded-2xl p-5 flex flex-col gap-4 shadow-sm"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Skeleton className="w-12 h-12 rounded-full shrink-0" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
              <Skeleton className="h-8 w-20 rounded-full shrink-0" />
            </div>
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
