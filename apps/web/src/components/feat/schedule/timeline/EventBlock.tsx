import { useState } from 'react';
import { AlertTriangle, Trash2 } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/cn';
import type { DragPayload, ScheduleItem } from '@/types/schedule';
import {
  formatDuration,
  formatTime,
  HOURS_END,
  MIN_DURATION_MINUTES,
  minuteToPx,
  openingStatusFor,
  placeName,
  RESIZE_STEP_MINUTES,
  HOUR_HEIGHT_PX,
  toneFor,
} from '@/utils/schedule';
import { TravelGap } from './Timeline';

interface EventBlockProps {
  item: ScheduleItem;
  next: ScheduleItem | undefined;
  /** Calendar weekday of this event's day (0=Sun..6=Sat) for the hours check. */
  weekday: number;
  onRemove: () => void;
  onResize: (durationMinutes: number) => void;
  dragLocked: boolean;
}

export function EventBlock({
  item,
  next,
  weekday,
  onRemove,
  onResize,
  dragLocked,
}: EventBlockProps) {
  const { t, i18n } = useTranslation();
  const top = minuteToPx(item.startMinute);
  const tone = toneFor(item.id);

  const [draftDuration, setDraftDuration] = useState<number | null>(null);
  const effectiveDuration = draftDuration ?? item.durationMinutes;

  // Re-check against opening hours using the live (draft) duration so the
  // warning updates as the user resizes.
  const openingStatus = openingStatusFor(
    { startMinute: item.startMinute, durationMinutes: effectiveDuration, place: item.place },
    weekday,
  );
  const hoursWarning =
    openingStatus === 'closed'
      ? t('schedule.hoursClosed', 'Place is closed at this time')
      : openingStatus === 'partial'
        ? t('schedule.hoursPartial', 'Runs outside opening hours')
        : null;
  const height = (effectiveDuration / 60) * HOUR_HEIGHT_PX;
  const isResizing = draftDuration !== null;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `event-${item.id}`,
    data: { kind: 'existing', scheduleId: item.id } satisfies DragPayload,
    disabled: isResizing || dragLocked,
  });

  const style: React.CSSProperties = {
    top,
    height,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    opacity: transform ? 0.6 : 1,
  };

  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    const handle = e.currentTarget;
    const pointerId = e.pointerId;
    handle.setPointerCapture(pointerId);

    const startY = e.clientY;
    const startDuration = item.durationMinutes;
    let latest = startDuration;

    const ceilingMinute = next !== undefined ? next.startMinute : HOURS_END * 60;
    const maxDuration = ceilingMinute - item.startMinute;

    const onMove = (ev: PointerEvent) => {
      const dyPx = ev.clientY - startY;
      const dyMinutes = (dyPx / HOUR_HEIGHT_PX) * 60;
      const raw = startDuration + dyMinutes;
      const snapped = Math.round(raw / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
      const nextDuration = Math.max(MIN_DURATION_MINUTES, Math.min(maxDuration, snapped));
      latest = nextDuration;
      setDraftDuration(nextDuration);
    };

    function cleanup() {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onCommit);
      handle.removeEventListener('pointercancel', onCancel);
      window.removeEventListener('blur', onCancel);
      document.removeEventListener('visibilitychange', onVisibility);
      if (handle.hasPointerCapture(pointerId)) {
        handle.releasePointerCapture(pointerId);
      }
    }

    const onCommit = () => {
      cleanup();
      setDraftDuration(null);
      if (latest !== startDuration) onResize(latest);
    };

    const onCancel = () => {
      cleanup();
      setDraftDuration(null);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'hidden') onCancel();
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onCommit);
    handle.addEventListener('pointercancel', onCancel);
    window.addEventListener('blur', onCancel);
    document.addEventListener('visibilitychange', onVisibility);
  }

  return (
    <>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={cn(
          'absolute left-2 right-2 overflow-hidden rounded-lg border px-3 py-2',
          'flex items-start gap-2 shadow-sm',
          tone.bg,
          tone.border,
          dragLocked ? 'cursor-wait' : 'cursor-grab active:cursor-grabbing',
          isResizing && 'ring-primary/60 ring-2',
          // Amber ring flags an event that doesn't fit the place's hours.
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
            {formatTime(item.startMinute)} - {formatTime(item.startMinute + effectiveDuration)}
            <span className="ml-1 opacity-70">({formatDuration(effectiveDuration)})</span>
          </p>
          {hoursWarning && (
            <p className="mt-0.5 flex items-center gap-1 truncate text-[0.65rem] font-medium text-amber-200">
              {hoursWarning}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label={t('schedule.removeFromSchedule')}
          className="text-primary-foreground/70 hover:text-destructive-foreground hover:bg-destructive -mr-1 -mt-1 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        <div
          role="slider"
          aria-label={t('schedule.resizeDuration')}
          aria-valuemin={MIN_DURATION_MINUTES}
          aria-valuenow={effectiveDuration}
          onPointerDown={handleResizePointerDown}
          onClick={(e) => e.stopPropagation()}
          className="group/resize absolute inset-x-0 bottom-0 flex h-2.5 cursor-ns-resize items-end justify-center"
        >
          <span
            className={cn(
              'mb-0.5 h-1 w-8 rounded-full transition-all',
              tone.bar,
              'opacity-40 group-hover/resize:h-1.5 group-hover/resize:opacity-80',
              isResizing && 'h-1.5 opacity-100',
            )}
          />
        </div>
      </div>

      {next && next.startMinute > item.startMinute + effectiveDuration && (
        <TravelGap
          startPx={minuteToPx(item.startMinute + effectiveDuration)}
          endPx={minuteToPx(next.startMinute)}
          gapMinutes={next.startMinute - (item.startMinute + effectiveDuration)}
        />
      )}
    </>
  );
}
