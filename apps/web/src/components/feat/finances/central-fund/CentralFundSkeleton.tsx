import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export function CentralFundSkeleton() {
  return (
    <div className="flex flex-col flex-1 overflow-y-auto lg:overflow-hidden gap-6 h-full min-h-0">
      <div className="shrink-0 space-y-4">
        
        {/* CentralFundCard Skeleton */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.05] to-transparent shadow-sm overflow-hidden relative dark:from-primary/[0.02]">
          <div className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-4 w-4 rounded-full" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 relative z-10">
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-32 mt-1" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="space-y-1">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-9 w-32 mt-1" />
              </div>
            </div>
            
            <div className="mt-8 space-y-2">
              <Skeleton className="h-3 w-full rounded-full" />
              <div className="flex justify-between items-center">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3 w-16" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:grid lg:grid-cols-2 gap-6 flex-1 min-h-0 lg:overflow-hidden pb-6 lg:pb-0">
        {/* Left Column: Member Contributions */}
        <div className="shrink-0 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-4">
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border bg-muted/20">
            <Skeleton className="h-4 w-48" />
          </div>
          <div className="divide-y divide-border">
            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="min-w-0 space-y-2">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-3 w-32" />
                </div>
              </div>
              <div className="shrink-0 flex items-center pl-2">
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-2 w-8" />
                </div>
              </div>
            </div>

            <div className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-24" />
                </div>
              </div>
              <div className="shrink-0 flex items-center pl-2">
                <div className="flex flex-col items-end gap-1">
                  <Skeleton className="w-5 h-5 rounded-full" />
                  <Skeleton className="h-2 w-8" />
                </div>
              </div>
            </div>
          </div>
        </div>
        </div>

        {/* Right Column: Activity Log */}
        <div className="shrink-0 lg:flex-1 lg:flex lg:flex-col lg:min-h-0 lg:overflow-y-auto lg:pr-2 lg:pb-4 space-y-4">
          <Skeleton className="shrink-0 h-4 w-24" />

          <div className="space-y-3">
            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Skeleton className="h-4 w-16" />
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-card border border-border rounded-2xl shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full shrink-0" />
                <div className="min-w-0 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <div className="flex items-center gap-1.5">
                    <Skeleton className="w-4 h-4 rounded-full shrink-0" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-2 w-2 rounded-full" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
