import type { LucideIcon } from 'lucide-react';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export interface ModalHeaderProps {
  /** Icon shown in the accent tile. */
  icon: LucideIcon;
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  /**
   * Accent of the icon tile. `primary` for create/detail surfaces,
   * `tertiary` to distinguish secondary actions (join, invite).
   */
  tone?: 'primary' | 'tertiary';
  /**
   * Truncate title/subtitle to one line - use when the text is
   * user-supplied and can overflow (e.g. a place name).
   */
  truncate?: boolean;
}

const TONE_TILE = {
  primary: 'bg-primary text-primary-foreground',
  tertiary: 'bg-tertiary text-tertiary-foreground',
} as const;

/**
 * Custom header for modals rendered with the `<Modal hideHeader>` flag:
 * an accent icon tile, title/subtitle, and its own close button. Shared so
 * every dialog (create trip, join, invite, place detail, terms…) reads the
 * same instead of each re-implementing the chrome.
 */
export function ModalHeader({
  icon: Icon,
  title,
  subtitle,
  onClose,
  tone = 'primary',
  truncate,
}: ModalHeaderProps) {
  return (
    <div className="relative px-5 pb-4 pt-5 sm:px-6">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-4 top-4 inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors sm:right-5"
      >
        <X className="h-4 w-4" strokeWidth={2} />
      </button>
      <div className={cn('flex items-center gap-3.5', truncate && 'pr-10')}>
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-sm',
            TONE_TILE[tone],
          )}
        >
          <Icon className="h-5 w-5" strokeWidth={2} />
        </div>
        <div className={cn('space-y-0.5', truncate && 'min-w-0')}>
          <h2
            className={cn(
              'font-headline text-foreground text-lg font-bold sm:text-xl',
              truncate && 'truncate',
            )}
          >
            {title}
          </h2>
          {subtitle && (
            <p
              className={cn('text-muted-foreground text-xs sm:text-sm', truncate && 'truncate')}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
