import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cn } from '../lib/cn';

export interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export interface DateRangePickerProps {
  value: DateRange;
  onChange: (range: DateRange) => void;
  /** Earliest selectable date. Defaults to today (00:00). Pass `null` to disable. */
  minDate?: Date | null;
  maxDate?: Date | null;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

const WEEKDAY_LABELS_EN = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const WEEKDAY_LABELS_TH = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const MONTH_LABELS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const POPOVER_WIDTH = 272;
const POPOVER_GAP = 8;
const POPOVER_HEIGHT_ESTIMATE = 360;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, 1);
}
function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}
function formatDate(date: Date): string {
  const locale = typeof document !== 'undefined' ? (document.documentElement.lang === 'th' ? 'th-TH' : 'en-US') : undefined;
  return date.toLocaleDateString(locale, { month: 'short', day: 'numeric', year: 'numeric' });
}

function buildMonthGrid(monthStart: Date): Date[] {
  const firstWeekday = monthStart.getDay();
  const gridStart = new Date(monthStart);
  gridStart.setDate(monthStart.getDate() - firstWeekday);
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

function findPortalHost(node: HTMLElement | null): HTMLElement {
  let el: HTMLElement | null = node;
  while (el) {
    if (el.tagName === 'DIALOG') return el;
    el = el.parentElement;
  }
  return document.body;
}

/**
 * Range date picker - pick a start then an end on a single calendar.
 * First click sets `from` (and clears `to`); the next click on/after it sets
 * `to`. Clicking before the current `from` restarts the range. Hovering
 * previews the in-progress range. Built standalone so the single-date
 * DatePicker (used elsewhere, e.g. schedule) is untouched.
 */
export function DateRangePicker({
  value,
  onChange,
  minDate,
  maxDate,
  placeholder,
  disabled,
  id,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState<Date>(() => startOfMonth(value.from ?? new Date()));
  const [hovered, setHovered] = useState<Date | null>(null);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const locale = typeof document !== 'undefined' ? (document.documentElement.lang === 'th' ? 'th-TH' : 'en-US') : undefined;
  const weekdayLabels = locale === 'th-TH' ? WEEKDAY_LABELS_TH : WEEKDAY_LABELS_EN;
  const defaultPlaceholder = locale === 'th-TH' ? 'เลือกวันที่' : 'Pick dates';
  const resolvedPlaceholder = placeholder ?? defaultPlaceholder;

  const minSelectable = minDate === null ? null : startOfDay(minDate ?? new Date());
  const maxSelectable = maxDate ? startOfDay(maxDate) : null;

  const label =
    value.from && value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : value.from
        ? `${formatDate(value.from)} – …`
        : null;

  useEffect(() => {
    if (open) setViewMonth(startOfMonth(value.from ?? minSelectable ?? new Date()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return;
    }
    function update() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const rect = trigger.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let left = rect.left;
      if (left + POPOVER_WIDTH > vw - 8) left = vw - POPOVER_WIDTH - 8;
      if (left < 8) left = 8;
      let top = rect.bottom + POPOVER_GAP;
      if (top + POPOVER_HEIGHT_ESTIMATE > vh - 8) {
        top = Math.max(8, rect.top - POPOVER_GAP - POPOVER_HEIGHT_ESTIMATE);
      }
      setPosition({ top, left });
    }
    update();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (triggerRef.current?.contains(target)) return;
      if (popoverRef.current?.contains(target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function handleDayClick(day: Date) {
    if (minSelectable && day < minSelectable) return;
    if (maxSelectable && day > maxSelectable) return;

    // No start yet, or a full range exists → begin a new range.
    if (!value.from || (value.from && value.to)) {
      onChange({ from: day, to: undefined });
      return;
    }
    // Have a start, picking the end.
    if (day < value.from) {
      // Clicked before start → restart from the earlier day.
      onChange({ from: day, to: undefined });
      return;
    }
    onChange({ from: value.from, to: day });
    setOpen(false);
  }

  // The end used for range highlighting - the chosen `to`, or the hovered day
  // while the user is mid-selection.
  const previewTo = value.to ?? (value.from && !value.to ? hovered : null);

  function inRange(day: Date): boolean {
    if (!value.from || !previewTo) return false;
    const lo = value.from < previewTo ? value.from : previewTo;
    const hi = value.from < previewTo ? previewTo : value.from;
    return day > lo && day < hi;
  }

  const grid = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const today = startOfDay(new Date());
  const portalHost = open ? findPortalHost(triggerRef.current) : null;

  const popover =
    open && position && portalHost
      ? createPortal(
          <div
            ref={popoverRef}
            role="dialog"
            aria-label={locale === 'th-TH' ? 'เลือกช่วงเวลา' : 'Choose date range'}
            style={{ position: 'fixed', top: position.top, left: position.left, width: POPOVER_WIDTH }}
            className={cn(
              'bg-popover text-popover-foreground border-border z-[60] rounded-xl border p-4 shadow-lg',
              'animate-in fade-in-0 zoom-in-95',
            )}
          >
            <div className="relative mb-2 flex h-8 items-center justify-center">
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, -1))}
                aria-label={locale === 'th-TH' ? 'เดือนก่อนหน้า' : 'Previous month'}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute left-0 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              >
                <ChevronGlyph direction="left" />
              </button>
              <span className="text-foreground text-sm font-semibold capitalize">
                {viewMonth.toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
              </span>
              <button
                type="button"
                onClick={() => setViewMonth((m) => addMonths(m, 1))}
                aria-label={locale === 'th-TH' ? 'เดือนถัดไป' : 'Next month'}
                className="text-muted-foreground hover:bg-muted hover:text-foreground absolute right-0 inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors"
              >
                <ChevronGlyph direction="right" />
              </button>
            </div>

            <div className="text-muted-foreground grid grid-cols-7 gap-y-1 text-[0.65rem] font-medium uppercase tracking-wide">
              {weekdayLabels.map((w) => (
                <div key={w} className="flex h-7 items-center justify-center">
                  {w}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHovered(null)}>
              {grid.map((day) => {
                const inMonth = day.getMonth() === viewMonth.getMonth();
                const isDisabled =
                  (!!minSelectable && day < minSelectable) ||
                  (!!maxSelectable && day > maxSelectable);
                const isToday = sameDay(day, today);
                const isStart = !!value.from && sameDay(day, value.from);
                const isEnd = !!previewTo && sameDay(day, previewTo);
                const isEndpoint = isStart || isEnd;
                const between = inRange(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      'relative flex h-9 items-center justify-center',
                      // Connecting band behind in-range + endpoint cells.
                      (between || (isEndpoint && value.from && previewTo)) && 'bg-primary/10',
                      isStart && value.to && 'rounded-l-full',
                      isEnd && value.from && 'rounded-r-full',
                      isStart && isEnd && 'rounded-full',
                    )}
                  >
                    <button
                      type="button"
                      disabled={isDisabled}
                      onClick={() => handleDayClick(day)}
                      onMouseEnter={() => setHovered(day)}
                      className={cn(
                        'relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors',
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                        !inMonth && 'text-muted-foreground/50',
                        inMonth && !isEndpoint && !between && 'text-foreground hover:bg-muted',
                        between && 'text-foreground',
                        isEndpoint && 'bg-primary text-primary-foreground hover:bg-primary rounded-full',
                        isDisabled && 'pointer-events-none opacity-30',
                        isToday &&
                          !isEndpoint &&
                          'after:bg-primary after:absolute after:bottom-1 after:left-1/2 after:h-1 after:w-1 after:-translate-x-1/2 after:rounded-full',
                      )}
                    >
                      {day.getDate()}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>,
          portalHost,
        )
      : null;

  return (
    <div className={cn('relative', className)}>
      <button
        id={id}
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'border-input bg-background text-foreground flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm',
          'hover:bg-muted/50 transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
          'disabled:cursor-not-allowed disabled:opacity-50',
          !label && 'text-muted-foreground',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <CalendarGlyph className="text-muted-foreground h-4 w-4 shrink-0" />
        <span className="truncate">{label ?? resolvedPlaceholder}</span>
      </button>
      {popover}
    </div>
  );
}

function ChevronGlyph({ direction }: { direction: 'left' | 'right' }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      {direction === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}

function CalendarGlyph({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M8 2v4M16 2v4M3 10h18" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
    </svg>
  );
}
