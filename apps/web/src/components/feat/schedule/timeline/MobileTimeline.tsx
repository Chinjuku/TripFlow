import { AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { ScheduleItem } from '@/types/schedule';
import {
  formatDuration,
  formatTime,
  HOURS_END,
  HOURS_START,
  HOUR_HEIGHT_PX,
  minuteToPx,
  openingStatusFor,
  placeName,
  TIMELINE_HEIGHT_PX,
  toneFor,
} from '@/utils/schedule';

interface MobileTimelineProps {
  items: ScheduleItem[];
  /** Calendar weekday of the displayed day (0=Sun..6=Sat) for the hours check. */
  weekday: number;
  onSelect: (item: ScheduleItem) => void;
}

export function MobileTimeline({ items, weekday, onSelect }: MobileTimelineProps) {
  const { t, i18n } = useTranslation();
  const hourLines = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);

  return (
    <div className="relative ml-10" style={{ height: TIMELINE_HEIGHT_PX }}>
      {hourLines.map((h, idx) => {
        const top = idx * HOUR_HEIGHT_PX;
        return (
          <div key={h} className="absolute inset-x-0 flex items-start" style={{ top }}>
            <span className="text-muted-foreground absolute -left-10 -translate-y-1/2 text-[0.65rem] tabular-nums">
              {String(h).padStart(2, '0')}:00
            </span>
            <div className="border-border/60 w-full border-t" />
          </div>
        );
      })}

      {items.map((item) => {
        const top = minuteToPx(item.startMinute);
        const height = (item.durationMinutes / 60) * HOUR_HEIGHT_PX;
        const tone = toneFor(item.id);
        const status = openingStatusFor(item, weekday);
        const hoursWarning =
          status === 'closed'
            ? t('schedule.hoursClosed', 'Place is closed at this time')
            : status === 'partial'
              ? t('schedule.hoursPartial', 'Runs outside opening hours')
              : null;
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            style={{ top, height }}
            className={cn(
              'absolute left-2 right-2 flex items-start gap-2 overflow-hidden rounded-lg border px-3 py-2 text-left shadow-sm transition-shadow',
              tone.bg,
              tone.border,
              'active:shadow-md focus-visible:ring-primary/60 focus-visible:ring-2 focus-visible:outline-none',
              hoursWarning && 'ring-2 ring-amber-400',
            )}
          >
            <div className="min-w-0 flex-1">
              <p className={cn('flex items-center gap-1 truncate text-sm font-bold', tone.text)}>
                {hoursWarning && (
                  <AlertTriangle
                    className="h-3.5 w-3.5 shrink-0 text-amber-300"
                    strokeWidth={2.25}
                    aria-label={hoursWarning}
                  />
                )}
                <span className="truncate">{placeName(item.place, i18n.language)}</span>
              </p>
              <p className="text-primary-foreground/80 mt-0.5 truncate text-xs">
                {formatTime(item.startMinute)} -{' '}
                {formatTime(item.startMinute + item.durationMinutes)}
                <span className="ml-1 opacity-70">({formatDuration(item.durationMinutes)})</span>
              </p>
              {hoursWarning && (
                <p className="mt-0.5 truncate text-[0.65rem] font-medium text-amber-200">
                  {hoursWarning}
                </p>
              )}
            </div>
          </button>
        );
      })}

      {items.length === 0 && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center px-4 text-center text-sm">
          {t('schedule.tapToAdd')}
        </div>
      )}
    </div>
  );
}

interface TappablePlaceProps {
  children: React.ReactNode;
  onSelect: () => void;
  disabled?: boolean;
}

export function TappablePlace({ children, onSelect, disabled }: TappablePlaceProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className={cn(
        'border-border bg-card relative flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-shadow',
        'hover:border-primary/40 hover:shadow-sm active:shadow-md',
        'focus-visible:ring-primary/60 focus-visible:ring-2 focus-visible:outline-none',
        disabled && 'cursor-not-allowed opacity-50',
      )}
    >
      {children}
    </button>
  );
}
