import { useEffect, useMemo, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@trip-flow/ui/components/modal';
import { cn } from '@trip-flow/ui/lib/cn';
import type { ScheduleItem } from '@/types/schedule';
import {
  formatTime,
  HOURS_END,
  HOURS_START,
} from '@/utils/schedule';
import { DurationStepper, TimeStepper } from './AddPlaceSheet';

interface EditEventSheetProps {
  open: boolean;
  event: ScheduleItem | null;
  daySchedule: ScheduleItem[];
  onCancel: () => void;
  onSave: (input: { startMinute: number; durationMinutes: number }) => void | Promise<void>;
  onRemove: () => void | Promise<void>;
}

const STEP = 15;
const MIN_OF_DAY = HOURS_START * 60;
const MAX_OF_DAY = HOURS_END * 60;

export function EditEventSheet({
  open,
  event,
  daySchedule,
  onCancel,
  onSave,
  onRemove,
}: EditEventSheetProps) {
  const { t } = useTranslation();
  const [startMinute, setStartMinute] = useState(event?.startMinute ?? 9 * 60);
  const [duration, setDuration] = useState(event?.durationMinutes ?? 90);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !event) return;
    setStartMinute(event.startMinute);
    setDuration(event.durationMinutes);
    setSubmitting(false);
  }, [open, event]);

  const conflict = useMemo(() => {
    if (!event) return false;
    const end = startMinute + duration;
    return daySchedule.some((s) => {
      if (s.id === event.id) return false;
      const sEnd = s.startMinute + s.durationMinutes;
      return startMinute < sEnd && end > s.startMinute;
    });
  }, [daySchedule, startMinute, duration, event]);

  const outOfRange = startMinute < MIN_OF_DAY || startMinute + duration > MAX_OF_DAY;
  const unchanged =
    event !== null && startMinute === event.startMinute && duration === event.durationMinutes;
  const canSave = !conflict && !outOfRange && !unchanged && !submitting && event !== null;

  async function handleSave() {
    if (!canSave) return;
    setSubmitting(true);
    try {
      await onSave({ startMinute, durationMinutes: duration });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove() {
    setSubmitting(true);
    try {
      await onRemove();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title={t('schedule.editEvent')}
      description={event?.place.name ?? undefined}
    >
      {event && (
        <div className="space-y-5">
          <div className="bg-muted/40 border-border rounded-lg border p-3">
            <p className="text-foreground text-sm font-semibold">{event.place.name}</p>
            <p className="text-muted-foreground mt-0.5 text-xs tabular-nums">
              {t('schedule.wasPrefix')}: {formatTime(event.startMinute)} –{' '}
              {formatTime(event.startMinute + event.durationMinutes)}
            </p>
          </div>

          <TimeStepper
            label={t('schedule.timeStart')}
            value={startMinute}
            onChange={setStartMinute}
            min={MIN_OF_DAY}
            max={MAX_OF_DAY - duration}
            step={STEP}
            format={formatTime}
          />

          <DurationStepper value={duration} onChange={setDuration} />

          {(conflict || outOfRange) && (
            <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border px-3 py-2 text-xs">
              {conflict ? t('schedule.conflictOverlapShort') : t('schedule.outOfRange')}
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row-reverse sm:justify-between">
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onCancel}
                className="border-border hover:bg-muted h-10 rounded-lg border px-4 text-sm font-semibold"
              >
                {t('schedule.cancel')}
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={cn(
                  'bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-semibold transition-opacity',
                  !canSave && 'cursor-not-allowed opacity-50',
                )}
              >
                {submitting ? t('schedule.saving') : t('schedule.save')}
              </button>
            </div>
            <button
              type="button"
              onClick={handleRemove}
              disabled={submitting}
              className="border-destructive/40 text-destructive hover:bg-destructive/10 inline-flex h-10 items-center justify-center gap-1.5 rounded-lg border px-4 text-sm font-semibold disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" strokeWidth={1.75} />
              {t('schedule.remove')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
