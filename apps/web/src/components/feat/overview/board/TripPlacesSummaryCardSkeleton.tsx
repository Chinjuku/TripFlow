import { Skeleton } from '@/components/ui/skeleton';

interface TripPlacesSummaryCardSkeletonProps {
  className?: string;
}

/** Loading placeholder for TripPlacesSummaryCard - header + a few place rows. */
export function TripPlacesSummaryCardSkeleton({
  className = '',
}: TripPlacesSummaryCardSkeletonProps) {
  return (
    <div
      className={`border-border bg-card shadow-xs flex flex-col rounded-2xl border p-4 sm:p-6 ${className}`}
    >
      <div className="border-border mb-4 flex shrink-0 flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full space-y-1 sm:w-2/3">
          <Skeleton className="h-5 w-[50%]" />
          <Skeleton className="h-3 w-[70%]" />
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
