import { Skeleton } from '@/components/ui/skeleton';

export function TripFinancesAllSkeleton() {
  return (
    <div className="flex flex-col flex-1 overflow-hidden gap-6 h-full min-h-0">
      <div className="shrink-0 space-y-6">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 animate-pulse">
          {/* Card 1: Total Group Cost Skeleton */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 space-y-6">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-4 shrink-0" />
              <Skeleton className="h-3 w-32 uppercase" />
            </div>
            <div className="space-y-1">
              <Skeleton className="h-10 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </div>
            <div className="space-y-2 pt-2">
              <Skeleton className="h-2.5 w-full rounded-full" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-1/3" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          </div>

          {/* Card 2: Who Owes You Skeleton */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col h-full min-h-[14rem]">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-10 w-1/2 mt-3 mb-4" />
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-3 w-12" />
              </div>
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>

          {/* Card 3: What You Owe Skeleton */}
          <div className="rounded-2xl border border-border bg-card shadow-sm p-6 flex flex-col h-full min-h-[14rem]">
            <Skeleton className="h-8 w-32 rounded-full" />
            <Skeleton className="h-10 w-1/2 mt-3 mb-4" />
            <div className="space-y-3 flex-1 flex flex-col justify-end">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <div className="flex items-center gap-3">
                  <Skeleton className="h-3 w-12" />
                  <Skeleton className="h-5 w-14 rounded" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ExpenseList Skeleton */}
      <div className="flex-1 overflow-y-auto pr-2 pb-10 min-h-0 space-y-4 scrollbar-none animate-pulse">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="bg-card border border-border rounded-2xl p-4 sm:p-5 flex items-center justify-between shadow-sm"
            >
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
    </div>
  );
}
