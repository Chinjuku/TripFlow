import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { ArrowLeft, ArrowUp, Clock, MapPin, Trash2 } from 'lucide-react';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { cn } from '@trip-flow/ui/lib/cn';
import { useTrip } from '@/features/trips';
import { useTripPlaces, type TripPlace } from '@/features/places';
import {
  addSchedule,
  removeSchedule,
  updateSchedule,
  useSchedule,
  type ScheduleItem,
} from '@/features/schedule';

const HOURS_START = 8; // 08:00
const HOURS_END = 22; // 22:00 (last grid line)
const HOUR_HEIGHT_PX = 56;
const TIMELINE_HEIGHT_PX = (HOURS_END - HOURS_START) * HOUR_HEIGHT_PX;
const DEFAULT_DURATION = 90;

const DAY_MS = 24 * 60 * 60 * 1000;

interface DayInfo {
  index: number;
  date: Date;
  label: string;
  subLabel: string;
}

function buildDays(startsOn: string, endsOn: string): DayInfo[] {
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  // Inclusive count: trip from May 28 → May 30 is 3 days.
  const count = Math.max(
    1,
    Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1,
  );
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      index: i,
      date,
      label: `Day ${i + 1}`,
      subLabel: date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
    };
  });
}

function formatTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

function snapMinute(minute: number, step = 15): number {
  return Math.max(HOURS_START * 60, Math.round(minute / step) * step);
}

/**
 * Builds a Google Maps directions URL from one scheduled stop to the next.
 *
 * Prefers Google place_ids (cached on `trip_places.external_id` when the
 * pick came from the map) — that pins the route to the exact venue rather
 * than a fuzzy name search. Falls back to lat/lng, then to the place name.
 *
 * @see https://developers.google.com/maps/documentation/urls/get-started#directions-action
 */
function buildMapsDirectionsUrl(from: ScheduleItem, to: ScheduleItem): string {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });
  const origin = describeLocation(from);
  const destination = describeLocation(to);
  params.set('origin', origin.query);
  if (origin.placeId) params.set('origin_place_id', origin.placeId);
  params.set('destination', destination.query);
  if (destination.placeId) params.set('destination_place_id', destination.placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function describeLocation(item: ScheduleItem): { query: string; placeId?: string } {
  const place = item.place;
  const placeId = isGooglePlaceId(place.externalId) ? place.externalId : undefined;

  if (place.lat !== null && place.lng !== null) {
    return { query: `${place.lat},${place.lng}`, placeId };
  }
  return { query: place.name, placeId };
}

/**
 * Distinguishes a Google place_id (e.g. "ChIJN1t_tDeuEmsRUsoyG83frY4") from
 * our internal UUIDs. Heuristic, not perfect — but UUID v4 is dash-separated
 * and place_ids are not, so a single regex tells them apart cheaply.
 */
function isGooglePlaceId(value: string | null | undefined): value is string {
  if (!value || value.length < 10) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value)) return false; // UUID
  return true;
}

/** Pixel offset (from timeline top) → minute since midnight. */
function pxToMinute(px: number): number {
  return snapMinute(HOURS_START * 60 + (px / HOUR_HEIGHT_PX) * 60);
}

/** Minute since midnight → pixel offset from timeline top. */
function minuteToPx(minute: number): number {
  return ((minute - HOURS_START * 60) / 60) * HOUR_HEIGHT_PX;
}

export default function TripSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { data: trip } = useTrip(id);
  const { data: places } = useTripPlaces(id);
  const { data: schedule, mutate, error, isLoading } = useSchedule(id);

  const days = useMemo(
    () => (trip ? buildDays(trip.startsOn, trip.endsOn) : []),
    [trip],
  );
  const [activeDay, setActiveDay] = useState(0);
  const [dragging, setDragging] = useState<DragPayload | null>(null);

  const placesById = useMemo(() => {
    const map = new Map<string, TripPlace>();
    for (const p of places ?? []) map.set(p.id, p);
    return map;
  }, [places]);

  // Schedule rows split by day for the active view.
  const itemsForDay = useMemo(
    () =>
      (schedule ?? [])
        .filter((s) => s.dayIndex === activeDay)
        .sort((a, b) => a.startMinute - b.startMinute),
    [schedule, activeDay],
  );

  // Sidebar list: candidate places that haven't been scheduled on this day yet,
  // sorted by vote count (matches the Top Voted ref).
  const topVotedForDay = useMemo(() => {
    const scheduledIdsForDay = new Set(
      (schedule ?? [])
        .filter((s) => s.dayIndex === activeDay)
        .map((s) => s.tripPlaceId),
    );
    return (places ?? [])
      .filter((p) => !scheduledIdsForDay.has(p.id))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [places, schedule, activeDay]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    if (data) setDragging(data);
  }

  async function handleDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    setDragging(null);
    if (!id || !data) return;
    if (e.over?.id !== 'timeline') return;

    // Translate the drop offset to a minute-of-day. dnd-kit gives us the
    // active rect (rendered DragOverlay) — we use its top against the
    // droppable rect's top to derive the timeline y-coord.
    const overRect = e.over.rect;
    const activeRect = e.active.rect.current.translated;
    if (!overRect || !activeRect) return;

    const yWithinTimeline = activeRect.top - overRect.top;
    const startMinute = pxToMinute(yWithinTimeline);

    try {
      if (data.kind === 'new') {
        const created = await addSchedule(id, {
          tripPlaceId: data.tripPlaceId,
          dayIndex: activeDay,
          startMinute,
          durationMinutes: DEFAULT_DURATION,
        });
        mutate((prev) => [...(prev ?? []), created]);
      } else {
        const updated = await updateSchedule(id, data.scheduleId, {
          startMinute,
          dayIndex: activeDay,
        });
        mutate((prev) =>
          (prev ?? []).map((s) => (s.id === data.scheduleId ? updated : s)),
        );
      }
    } catch (err) {
      console.error('[schedule] drop failed', err);
    }
  }

  async function handleRemove(scheduleId: string) {
    if (!id) return;
    try {
      await removeSchedule(id, scheduleId);
      mutate((prev) => (prev ?? []).filter((s) => s.id !== scheduleId));
    } catch (err) {
      console.error('[schedule] remove failed', err);
    }
  }

  if (!id) return null;

  const activeDayMeta = days[activeDay];

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        {/* Header */}
        <div className="space-y-2">
          <Link
            to={`/trips/${id}`}
            className="text-muted-foreground hover:text-primary inline-flex items-center gap-2 text-xs font-semibold transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Trip workspace
          </Link>
          <h1 className="text-foreground font-headline text-2xl font-extrabold tracking-tight sm:text-3xl">
            Trip Schedule
          </h1>
        </div>

        {/* Day tabs */}
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
          {days.map((d) => (
            <button
              key={d.index}
              type="button"
              onClick={() => setActiveDay(d.index)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
                d.index === activeDay
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'bg-card text-foreground border-border hover:bg-muted',
              )}
            >
              <span>{d.subLabel}</span>
              <span className="opacity-60">•</span>
              <span>{d.label}</span>
            </button>
          ))}
        </div>

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
            {error.message}
          </div>
        )}

        {/* Route flow — high-level A → B → C summary of the day */}
        <RouteFlowCard items={itemsForDay} />

        {/* Main grid: timeline + sidebar */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          {/* Timeline card */}
          <div className="border-border bg-card rounded-2xl border p-5">
            <div className="border-border mb-4 border-b pb-3">
              <h2 className="text-foreground font-headline text-lg font-bold">
                {activeDayMeta
                  ? `${activeDayMeta.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (${activeDayMeta.label})`
                  : 'Day'}
              </h2>
            </div>

            {isLoading && schedule === null ? (
              <Skeleton className="h-[28rem] w-full" />
            ) : (
              <Timeline
                items={itemsForDay}
                onRemove={handleRemove}
                ghost={dragging?.kind === 'new' ? dragging : null}
              />
            )}
          </div>

          {/* Top voted sidebar */}
          <aside className="border-border bg-card h-fit rounded-2xl border p-5">
            <div className="border-border mb-3 flex items-center justify-between gap-2 border-b pb-3">
              <h3 className="text-foreground font-headline text-base font-bold">
                Top Voted Places
              </h3>
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {topVotedForDay.length}
                {topVotedForDay.length === 1 ? ' item' : ' items'}
              </span>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              Drag items to the schedule to plan your day.
            </p>

            {topVotedForDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No more candidates left to schedule.
              </p>
            ) : (
              <div className="space-y-2.5">
                {topVotedForDay.slice(0, 8).map((p) => (
                  <DraggablePlace key={p.id} place={p} />
                ))}
              </div>
            )}
          </aside>
        </div>
      </div>

      {/* Floating preview while dragging */}
      <DragOverlay>
        {dragging?.kind === 'new' && placesById.get(dragging.tripPlaceId) ? (
          <PlacePill place={placesById.get(dragging.tripPlaceId)!} dragging />
        ) : dragging?.kind === 'existing' ? (
          <div className="bg-primary/90 text-primary-foreground rounded-md px-3 py-2 text-sm font-semibold shadow-lg">
            Moving event…
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

/* ------------------------------------------------------------------------ */
/*  Drag payload                                                            */
/* ------------------------------------------------------------------------ */

type DragPayload =
  | { kind: 'new'; tripPlaceId: string }
  | { kind: 'existing'; scheduleId: string };

/* ------------------------------------------------------------------------ */
/*  Timeline (droppable + event blocks)                                     */
/* ------------------------------------------------------------------------ */

interface TimelineProps {
  items: ScheduleItem[];
  onRemove: (scheduleId: string) => void;
  ghost: ({ kind: 'new'; tripPlaceId: string }) | null;
}

function Timeline({ items, onRemove }: TimelineProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' });

  const hourLines = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative ml-12 transition-colors',
        isOver && 'bg-primary/5 rounded-lg',
      )}
      style={{ height: TIMELINE_HEIGHT_PX }}
    >
      {/* Hour grid lines + labels */}
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

      {/* Schedule blocks */}
      {items.map((item, idx) => {
        const next = items[idx + 1];
        return (
          <EventBlock
            key={item.id}
            item={item}
            next={next}
            onRemove={() => onRemove(item.id)}
          />
        );
      })}

      {/* Empty hint */}
      {items.length === 0 && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          Drag a place here to start scheduling.
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------------ */
/*  Event block                                                             */
/* ------------------------------------------------------------------------ */

const TONES: Array<{ bg: string; border: string; bar: string; text: string }> = [
  {
    bg: 'bg-emerald-50 dark:bg-emerald-500/10',
    border: 'border-emerald-200 dark:border-emerald-500/30',
    bar: 'bg-emerald-500',
    text: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    bg: 'bg-violet-50 dark:bg-violet-500/10',
    border: 'border-violet-200 dark:border-violet-500/30',
    bar: 'bg-violet-500',
    text: 'text-violet-700 dark:text-violet-300',
  },
  {
    bg: 'bg-rose-50 dark:bg-rose-500/10',
    border: 'border-rose-200 dark:border-rose-500/30',
    bar: 'bg-rose-500',
    text: 'text-rose-700 dark:text-rose-300',
  },
  {
    bg: 'bg-amber-50 dark:bg-amber-500/10',
    border: 'border-amber-200 dark:border-amber-500/30',
    bar: 'bg-amber-500',
    text: 'text-amber-700 dark:text-amber-300',
  },
];

function toneFor(scheduleId: string) {
  // Stable per-id pick so re-renders keep the same colour. Hash the first
  // few hex chars of the uuid — good enough for visual variety.
  let h = 0;
  for (let i = 0; i < Math.min(scheduleId.length, 8); i++) h = (h * 31 + scheduleId.charCodeAt(i)) | 0;
  const tone = TONES[Math.abs(h) % TONES.length];
  if (!tone) throw new Error('TONES is empty');
  return tone;
}

interface EventBlockProps {
  item: ScheduleItem;
  next: ScheduleItem | undefined;
  onRemove: () => void;
}

function EventBlock({ item, next, onRemove }: EventBlockProps) {
  const top = minuteToPx(item.startMinute);
  const height = (item.durationMinutes / 60) * HOUR_HEIGHT_PX;
  const tone = toneFor(item.id);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `event-${item.id}`,
    data: { kind: 'existing', scheduleId: item.id } satisfies DragPayload,
  });

  // dnd-kit's transform is applied to the dragged element directly so it
  // tracks the cursor; we keep it visible but slightly faded.
  const style: React.CSSProperties = {
    top,
    height,
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
      : undefined,
    opacity: transform ? 0.6 : 1,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        {...listeners}
        {...attributes}
        style={style}
        className={cn(
          'absolute left-2 right-2 cursor-grab overflow-hidden rounded-lg border px-3 py-2',
          'flex items-start gap-2 shadow-sm',
          tone.bg,
          tone.border,
          'active:cursor-grabbing',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-bold', tone.text)}>{item.place.name}</p>
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {item.place.category ?? 'Event'} · {formatTime(item.startMinute)} -{' '}
            {formatTime(item.startMinute + item.durationMinutes)}
          </p>
        </div>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          aria-label="Remove from schedule"
          className="text-muted-foreground hover:text-destructive inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>
      </div>

      {/* Travel gap chip between adjacent events */}
      {next && next.startMinute > item.startMinute + item.durationMinutes && (
        <TravelGap
          startPx={minuteToPx(item.startMinute + item.durationMinutes)}
          endPx={minuteToPx(next.startMinute)}
          gapMinutes={next.startMinute - (item.startMinute + item.durationMinutes)}
        />
      )}
    </>
  );
}

interface TravelGapProps {
  startPx: number;
  endPx: number;
  gapMinutes: number;
}

function TravelGap({ startPx, endPx, gapMinutes }: TravelGapProps) {
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

/* ------------------------------------------------------------------------ */
/*  Sidebar place pill (draggable)                                          */
/* ------------------------------------------------------------------------ */

function DraggablePlace({ place }: { place: TripPlace }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `place-${place.id}`,
    data: { kind: 'new', tripPlaceId: place.id } satisfies DragPayload,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'border-border bg-card relative flex cursor-grab items-start gap-3 rounded-xl border p-3 transition-shadow',
        'hover:border-primary/40 hover:shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <PlacePill place={place} />
    </div>
  );
}

function PlacePill({ place, dragging }: { place: TripPlace; dragging?: boolean }) {
  return (
    <>
      {place.photoUrl ? (
        <img
          src={place.photoUrl}
          alt=""
          loading="lazy"
          className="bg-muted h-12 w-12 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <div className="bg-muted text-muted-foreground flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
          <MapPin className="h-4 w-4" strokeWidth={1.75} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="text-foreground truncate text-sm font-semibold">{place.name}</p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[0.65rem] font-bold',
              place.voteCount > 0
                ? 'bg-success/10 text-success'
                : 'bg-muted text-muted-foreground',
            )}
          >
            <ArrowUp className="h-2.5 w-2.5" strokeWidth={3} />
            {place.voteCount}
          </span>
        </div>
        <p className="text-muted-foreground mt-0.5 truncate text-xs">
          {place.category ?? 'Place'}
          {place.openingHoursText && ` · ${place.openingHoursText}`}
        </p>
      </div>
      {dragging && (
        <div
          aria-hidden
          className="bg-card border-primary absolute inset-0 -m-px rounded-xl border-2 shadow-lg"
        />
      )}
    </>
  );
}

/* ------------------------------------------------------------------------ */
/*  Route flow card — horizontal A → B → C chip summary                    */
/* ------------------------------------------------------------------------ */

function RouteFlowCard({ items }: { items: ScheduleItem[] }) {
  if (items.length === 0) {
    return (
      <div className="border-border bg-card text-muted-foreground rounded-2xl border border-dashed px-5 py-4 text-center text-xs">
        Your route flow will appear here once you schedule stops for the day.
      </div>
    );
  }

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-foreground text-xs font-bold uppercase tracking-wide">
          Route flow
        </h3>
        <span className="text-muted-foreground text-xs">
          {items.length} {items.length === 1 ? 'stop' : 'stops'}
        </span>
      </div>

      {/* Horizontal scroll on narrow viewports — keeps long days legible without wrapping. */}
      <div className="-mx-1 flex items-stretch gap-1 overflow-x-auto px-1 pb-1">
        {items.map((item, idx) => (
          <RouteFlowStep
            key={item.id}
            index={idx}
            item={item}
            next={items[idx + 1]}
          />
        ))}
      </div>
    </div>
  );
}

interface RouteFlowStepProps {
  index: number;
  item: ScheduleItem;
  next: ScheduleItem | undefined;
}

function RouteFlowStep({ index, item, next }: RouteFlowStepProps) {
  const tone = toneFor(item.id);

  return (
    <>
      <div className="flex shrink-0 items-stretch">
        <div
          className={cn(
            'flex min-w-[10rem] max-w-[14rem] flex-col gap-1 rounded-xl border px-3 py-2',
            tone.bg,
            tone.border,
          )}
        >
          <div className="flex items-center gap-2">
            <span
              className={cn(
                'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[0.65rem] font-bold text-white',
                tone.bar,
              )}
            >
              {index + 1}
            </span>
            <span className={cn('truncate text-xs font-semibold', tone.text)}>
              {item.place.name}
            </span>
          </div>
          <p className="text-muted-foreground pl-7 text-[0.65rem] tabular-nums">
            {formatTime(item.startMinute)} · {formatDuration(item.durationMinutes)}
          </p>
        </div>
      </div>

      {next && (
        <a
          href={buildMapsDirectionsUrl(item, next)}
          target="_blank"
          rel="noreferrer"
          title={`Open directions from ${item.place.name} to ${next.place.name}`}
          className="text-muted-foreground/70 hover:text-foreground hover:bg-muted/60 group/arrow flex shrink-0 flex-col items-center justify-center rounded-md px-1.5 py-1 transition-colors"
        >
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
            <path d="M5 12h14M13 5l7 7-7 7" />
          </svg>
          {next.startMinute > item.startMinute + item.durationMinutes ? (
            <span className="mt-0.5 text-[0.6rem] tabular-nums">
              +{formatDuration(next.startMinute - (item.startMinute + item.durationMinutes))}
            </span>
          ) : (
            <span className="mt-0.5 text-[0.55rem] uppercase tracking-wide opacity-0 transition-opacity group-hover/arrow:opacity-100">
              Map
            </span>
          )}
        </a>
      )}
    </>
  );
}
