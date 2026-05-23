import { Skeleton } from '@trip-flow/ui/components/skeleton';

export function TripBoardSkeleton() {
  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-8">
      <div className="border-border flex flex-col gap-4 border-b pb-6">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-9 w-72" />
        <Skeleton className="h-4 w-56" />
      </div>
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
          <Skeleton className="h-24 w-full rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-32 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
