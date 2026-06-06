import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { TripStatus } from '@/utils/trips';

/** Per-status colour + dot. Tailwind classes are literal so they're not purged. */
const STYLES: Record<TripStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  planning: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  upcoming: 'bg-warning/10 text-warning',
  active: 'bg-success/10 text-success',
  past: 'bg-muted text-muted-foreground',
};

const DOT: Record<TripStatus, string> = {
  draft: 'bg-muted-foreground/50',
  planning: 'bg-sky-500',
  upcoming: 'bg-warning',
  active: 'bg-success',
  past: 'bg-muted-foreground/50',
};

// Literal label keys (not a template string) so the typed `t()` accepts them.
const LABEL_KEY = {
  draft: 'trips.status.draft',
  planning: 'trips.status.planning',
  upcoming: 'trips.status.upcoming',
  active: 'trips.status.active',
  past: 'trips.status.past',
} as const satisfies Record<TripStatus, string>;

export function StatusBadge({ status, className }: { status: TripStatus; className?: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-semibold',
        STYLES[status],
        className,
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', DOT[status])} aria-hidden />
      {t(LABEL_KEY[status])}
    </span>
  );
}
