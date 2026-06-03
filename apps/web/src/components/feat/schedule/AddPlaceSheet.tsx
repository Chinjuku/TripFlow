import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@trip-flow/ui/components/modal';
import { cn } from '@trip-flow/ui/lib/cn';
import type { TripPlace } from '@/types/places';
import type { ScheduleItem } from '@/types/schedule';
import {
  DEFAULT_DURATION,
  formatDuration,
  formatTime,
  HOURS_END,
  HOURS_START,
  MIN_DURATION_MINUTES,
} from '@/utils/schedule';
import { localized } from '@/utils/places-map';

interface AddPlaceSheetProps {
  open: boolean;
  place: TripPlace | null;
  dayLabel: string;
  daySchedule: ScheduleItem[];
  onCancel: () => void;
  onConfirm: (input: { startMinute: number; durationMinutes: number }) => void | Promise<void>;
}

const STEP = 15;
const MIN_OF_DAY = HOURS_START * 60;
const MAX_OF_DAY = HOURS_END * 60;

function suggestStart(items: ScheduleItem[], duration: number): number {
  if (items.length === 0) return 9 * 60;
  const sorted = [...items].sort((a, b) => a.startMinute - b.startMinute);
  let cursor = MIN_OF_DAY;
  for (const it of sorted) {
    if (cursor + duration <= it.startMinute) return cursor;
    cursor = Math.max(cursor, it.startMinute + it.durationMinutes);
  }
  return Math.min(cursor, MAX_OF_DAY - duration);
}

export function AddPlaceSheet({
  open,
  place,
  dayLabel,
  daySchedule,
  onCancel,
  onConfirm,
}: AddPlaceSheetProps) {
  const { t, i18n } = useTranslation();
  const displayName = place ? (localized(i18n.language, place.name, place.nameEn) ?? place.name) : '';
  const initialDuration = place?.stayMinutes || DEFAULT_DURATION;
  const [duration, setDuration] = useState(initialDuration);
  const [startMinute, setStartMinute] = useState(() => suggestStart(daySchedule, initialDuration));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !place) return;
    const d = place.stayMinutes || DEFAULT_DURATION;
    setDuration(d);
    setStartMinute(suggestStart(daySchedule, d));
    setSubmitting(false);
  }, [open, place, daySchedule]);

  const conflict = useMemo(() => {
    const end = startMinute + duration;
    return daySchedule.some((s) => {
      const sEnd = s.startMinute + s.durationMinutes;
      return startMinute < sEnd && end > s.startMinute;
    });
  }, [daySchedule, startMinute, duration]);

  const outOfRange = startMinute < MIN_OF_DAY || startMinute + duration > MAX_OF_DAY;
  const canSubmit = !conflict && !outOfRange && !submitting && place !== null;

  async function handleSubmit() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      await onConfirm({ startMinute, durationMinutes: duration });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      open={open}
      onOpenChange={(o) => !o && onCancel()}
      title={t('schedule.addToDay')}
      description={place ? displayName : undefined}
    >
      {place && (
        <div className="space-y-5">
          <div className="bg-muted/40 border-border rounded-lg border p-3">
            <p className="text-foreground text-sm font-semibold">{displayName}</p>
            <p className="text-muted-foreground mt-0.5 text-xs">{dayLabel}</p>
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
              {conflict ? t('schedule.conflictOverlap') : t('schedule.outOfRange')}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onCancel}
              className="border-border hover:bg-muted h-10 rounded-lg border px-4 text-sm font-semibold"
            >
              {t('schedule.cancel')}
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className={cn(
                'bg-primary text-primary-foreground h-10 rounded-lg px-4 text-sm font-semibold transition-opacity',
                !canSubmit && 'cursor-not-allowed opacity-50',
              )}
            >
              {submitting ? t('schedule.adding') : t('schedule.addToTimeline')}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

interface TimeStepperProps {
  label: string;
  value: number;
  onChange: (next: number) => void;
  min: number;
  max: number;
  step: number;
  format: (minute: number) => string;
}

export function TimeStepper({ label, value, onChange, min, max, step, format }: TimeStepperProps) {
  const { t } = useTranslation();
  const dec = () => onChange(Math.max(min, value - step));
  const inc = () => onChange(Math.min(max, value + step));
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
        {label}
      </p>
      <div className="border-border flex items-center justify-between rounded-lg border">
        <StepperButton onClick={dec} disabled={value <= min} aria-label={t('schedule.decreaseTime')}>
          −
        </StepperButton>
        <span className="text-foreground flex-1 text-center text-lg font-bold tabular-nums">
          {format(value)}
        </span>
        <StepperButton onClick={inc} disabled={value >= max} aria-label={t('schedule.increaseTime')}>
          +
        </StepperButton>
      </div>
    </div>
  );
}

const DURATION_PRESETS = [30, 60, 90, 120, 180, 240];

interface DurationStepperProps {
  value: number;
  onChange: (next: number) => void;
  max?: number;
}

export function DurationStepper({ value, onChange, max }: DurationStepperProps) {
  const { t } = useTranslation();
  const ceiling = max ?? MAX_OF_DAY - MIN_OF_DAY;
  const dec = () => onChange(Math.max(MIN_DURATION_MINUTES, value - STEP));
  const inc = () => onChange(Math.min(ceiling, value + STEP));
  return (
    <div>
      <p className="text-muted-foreground mb-1.5 text-xs font-semibold uppercase tracking-wide">
        {t('schedule.duration')}
      </p>
      <div className="border-border flex items-center justify-between rounded-lg border">
        <StepperButton
          onClick={dec}
          disabled={value <= MIN_DURATION_MINUTES}
          aria-label={t('schedule.decreaseTime')}
        >
          −
        </StepperButton>
        <span className="text-foreground flex-1 text-center text-lg font-bold tabular-nums">
          {formatDuration(value)}
        </span>
        <StepperButton onClick={inc} disabled={value >= ceiling} aria-label={t('schedule.increaseTime')}>
          +
        </StepperButton>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {DURATION_PRESETS.filter((p) => p <= ceiling).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            className={cn(
              'rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
              value === p
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {formatDuration(p)}
          </button>
        ))}
      </div>
    </div>
  );
}

function StepperButton({
  onClick,
  disabled,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-foreground hover:bg-muted flex h-11 w-12 items-center justify-center text-xl font-bold transition-colors',
        disabled && 'cursor-not-allowed opacity-40',
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
