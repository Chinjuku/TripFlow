import { Skeleton } from '@trip-flow/ui/components/skeleton';

export function TripListSkeleton() {
  return (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="h-72 rounded-2xl sm:h-[22rem]" />
      ))}
    </>
  );
}
