import { Skeleton } from '@trip-flow/ui/components/skeleton';

export function TripBoardSkeleton() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:gap-8">
      {/* TripPageHeader Equivalent */}
      <div className="border-border flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 w-full sm:w-1/2">
          {/* BackLink */}
          <div className="mb-2 flex items-center gap-2">
            <Skeleton className="h-3.5 w-3.5 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          {/* Title */}
          <Skeleton className="mt-1 h-9 w-3/4 max-w-sm" />
          {/* Subtitle */}
          <Skeleton className="mt-2 h-4 w-[90%] max-w-md" />
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          <Skeleton className="h-10 w-full rounded-md sm:w-24" />
          <Skeleton className="h-10 w-full rounded-md sm:w-32" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:h-[calc(100vh-14rem)] lg:grid-cols-3 lg:gap-8 lg:overflow-hidden">
        <div className="space-y-6 lg:col-span-2 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
          <Skeleton className="h-6 w-1/3 max-w-[12rem] shrink-0" />
          <div className="shrink-0">
            {/* TripOverviewCard Skeleton */}
            <div className="border-border bg-card rounded-2xl border p-4 sm:p-6">
              <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <Skeleton className="h-3 w-16 uppercase tracking-wide" />
                  <Skeleton className="mt-2 h-5 w-40" />
                  <Skeleton className="mt-1 h-4 w-24" />
                </div>
                <div>
                  <Skeleton className="h-3 w-20 uppercase tracking-wide" />
                  <Skeleton className="mt-2 h-5 w-32" />
                </div>
              </dl>
              <div className="border-border mt-6 flex items-center justify-between gap-3 rounded-xl border p-4">
                <div className="w-full space-y-1">
                  <Skeleton className="h-4 w-[60%]" />
                  <Skeleton className="h-3 w-[85%]" />
                </div>
                <Skeleton className="h-4 w-4 shrink-0" />
              </div>
            </div>
          </div>

          {/* TripPlacesSummaryCard Skeleton */}
          <div className="border-border bg-card shadow-xs flex flex-col rounded-2xl border p-4 sm:p-6 lg:flex-1 lg:overflow-hidden">
            <div className="border-border mb-4 flex shrink-0 flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="w-full space-y-1 sm:w-2/3">
                <Skeleton className="h-5 w-[50%]" />
                <Skeleton className="h-3 w-[70%]" />
              </div>
            </div>
            <div className="flex-1 space-y-3 overflow-hidden">
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
              <Skeleton className="h-14 w-full rounded-xl" />
            </div>
          </div>
        </div>

        <div className="space-y-6 lg:flex lg:h-full lg:flex-col lg:overflow-hidden">
          <Skeleton className="h-6 w-1/2 max-w-[14rem] shrink-0" />
          <div className="-mr-1 pr-1 lg:flex-1 lg:overflow-y-auto scrollbar-none">
            {/* CollaboratorsPanel Skeleton */}
            <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-[40%]" />
                  <Skeleton className="h-3 w-[60%]" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-[50%]" />
                  <Skeleton className="h-3 w-[30%]" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-[35%]" />
                  <Skeleton className="h-3 w-[75%]" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
