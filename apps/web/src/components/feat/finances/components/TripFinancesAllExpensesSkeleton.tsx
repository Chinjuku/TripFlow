import { Skeleton } from '@trip-flow/ui/components/skeleton';

export function TripFinancesAllExpensesSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <Skeleton className="h-6 w-32" />
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <Skeleton className="w-11 h-11 rounded-full shrink-0" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32 sm:w-48" />
                <div className="flex items-center gap-1">
                  <Skeleton className="h-3 w-16" />
                  <span className="opacity-40 text-muted-foreground">•</span>
                  <Skeleton className="h-3 w-20" />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right space-y-1.5">
                <Skeleton className="h-5 w-16 ml-auto" />
                <Skeleton className="h-3 w-20 ml-auto" />
              </div>
              <Skeleton className="h-5 w-5 hidden sm:block shrink-0" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
