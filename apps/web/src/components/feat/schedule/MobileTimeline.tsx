import { cn } from '@trip-flow/ui/lib/cn';
import type { ScheduleItem } from '@/types/schedule';
import {
  formatDuration,
  formatTime,
  HOURS_END,
  HOURS_START,
  HOUR_HEIGHT_PX,
  minuteToPx,
  TIMELINE_HEIGHT_PX,
  toneFor,
} from '@/utils/schedule';

interface MobileTimelineProps {
  items: ScheduleItem[];
  onSelect: (item: ScheduleItem) => void;
}

export function MobileTimeline({ items, onSelect }: MobileTimelineProps) {
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
            )}
          >
            <div className="min-w-0 flex-1">
              <p className={cn('truncate text-sm font-bold', tone.text)}>{item.place.name}</p>
              <p className="text-primary-foreground/80 mt-0.5 truncate text-xs">
                {formatTime(item.startMinute)} -{' '}
                {formatTime(item.startMinute + item.durationMinutes)}
                <span className="ml-1 opacity-70">({formatDuration(item.durationMinutes)})</span>
              </p>
            </div>
          </button>
        );
      })}

      {items.length === 0 && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center px-4 text-center text-sm">
          แตะรายการด้านล่างเพื่อเพิ่มลงตาราง
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
