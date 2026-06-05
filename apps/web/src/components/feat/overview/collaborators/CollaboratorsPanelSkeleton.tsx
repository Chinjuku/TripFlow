import { Skeleton } from '@/components/ui/skeleton';

const ROW_WIDTHS = [
  { name: '40%', meta: '60%' },
  { name: '50%', meta: '30%' },
  { name: '35%', meta: '75%' },
] as const;

/** Loading placeholder for CollaboratorsPanel - a few member rows. */
export function CollaboratorsPanelSkeleton() {
  return (
    <div className="border-border bg-card space-y-4 rounded-2xl border p-4 sm:p-6">
      {ROW_WIDTHS.map((w, i) => (
        <div key={i} className="flex items-center gap-3">
          <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4" style={{ width: w.name }} />
            <Skeleton className="h-3" style={{ width: w.meta }} />
          </div>
        </div>
      ))}
    </div>
  );
}
