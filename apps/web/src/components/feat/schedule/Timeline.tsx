import { Clock } from 'lucide-react';
import { useDroppable } from '@dnd-kit/core';
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
} from '@/utils/schedule';
import { EventBlock } from './EventBlock';

interface TimelineProps {
  items: ScheduleItem[];
  onRemove: (scheduleId: string) => void;
  onResize: (scheduleId: string, durationMinutes: number) => void;
  ghost: { kind: 'new'; tripPlaceId: string } | null;
  dragPreview: { startMinute: number; durationMinutes: number; conflict: boolean } | null;
  pendingResizeIds: Set<string>;
  timelineRef: (el: HTMLDivElement | null) => void;
}

export function Timeline({
  items,
  onRemove,
  onResize,
  dragPreview,
  pendingResizeIds,
  timelineRef,
}: TimelineProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' });

  const hourLines = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);

  const composedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    timelineRef(el);
  };

  return (
    <div
      ref={composedRef}
      className={cn('relative ml-12 transition-colors', isOver && 'bg-primary/5 rounded-lg')}
      style={{ height: TIMELINE_HEIGHT_PX }}
    >
      {hourLines.map((h, idx) => {
        const top = idx * HOUR_HEIGHT_PX;
        return (
          <div key={h} className="absolute inset-x-0 flex items-start" style={{ top }}>
            <span className="text-muted-foreground absolute -left-12 -translate-y-1/2 text-xs tabular-nums">
              {String(h).padStart(2, '0')}:00
            </span>
            <div className="border-border/60 w-full border-t" />
          </div>
        );
      })}

      {items.map((item, idx) => {
        const next = items[idx + 1];
        return (
          <EventBlock
            key={item.id}
            item={item}
            next={next}
            onRemove={() => onRemove(item.id)}
            onResize={(duration) => onResize(item.id, duration)}
            dragLocked={pendingResizeIds.has(item.id)}
          />
        );
      })}

      {dragPreview && <DropPreview preview={dragPreview} />}

      {items.length === 0 && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          Drag a place here to start scheduling.
        </div>
      )}
    </div>
  );
}

function DropPreview({
  preview,
}: {
  preview: { startMinute: number; durationMinutes: number; conflict: boolean };
}) {
  const top = minuteToPx(preview.startMinute);
  const height = (preview.durationMinutes / 60) * HOUR_HEIGHT_PX;
  const endMinute = preview.startMinute + preview.durationMinutes;
  const { conflict } = preview;

  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute left-2 right-2 rounded-lg border-2 border-dashed',
        conflict ? 'border-destructive bg-destructive/10' : 'border-primary bg-primary/10',
      )}
      style={{ top, height }}
    >
      <span
        className={cn(
          'absolute -top-2 left-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.65rem] font-bold tabular-nums shadow-md',
          conflict
            ? 'bg-destructive text-destructive-foreground'
            : 'bg-primary text-primary-foreground',
        )}
      >
        {conflict ? (
          <>Overlaps · won't drop</>
        ) : (
          <>
            {formatTime(preview.startMinute)}
            <span className="opacity-70">→ {formatTime(endMinute)}</span>
          </>
        )}
      </span>
    </div>
  );
}

export function TravelGap({
  startPx,
  endPx,
  gapMinutes,
}: {
  startPx: number;
  endPx: number;
  gapMinutes: number;
}) {
  const top = startPx;
  const height = Math.max(0, endPx - startPx);
  if (height < 14) return null;

  return (
    <div
      className="absolute left-2 right-2 flex items-center justify-center"
      style={{ top, height }}
    >
      <span className="text-muted-foreground bg-card border-border inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem]">
        <Clock className="h-2.5 w-2.5" strokeWidth={2.5} />
        {formatDuration(gapMinutes)} gap
      </span>
    </div>
  );
}
