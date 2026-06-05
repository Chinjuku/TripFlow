import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function AllExpensesSkeleton() {
  return (
    <div className="space-y-8">
      {[0, 1].map((i) => (
        <div key={i} className="space-y-4">
          <Skeleton className="h-4 w-32" />
          {[0, 1, 2].map((j) => (
            <Skeleton key={j} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
