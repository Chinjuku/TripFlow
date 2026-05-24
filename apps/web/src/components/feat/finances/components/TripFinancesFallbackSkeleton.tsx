import { Skeleton } from '@trip-flow/ui/components/skeleton';

export function TripFinancesFallbackSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <Skeleton className="h-[300px] rounded-2xl w-full" />
    </div>
  );
}
