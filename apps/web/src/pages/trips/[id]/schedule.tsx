import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  ArrowLeft,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coffee,
  Flag,
  FlagTriangleRight,
  Hotel,
  Landmark,
  Map as MapIcon,
  MapPin,
  Mountain,
  ShoppingBag,
  Trash2,
  TreePine,
  Trophy,
  Utensils,
  Wine,
} from 'lucide-react';
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

const HOURS_START = 0; // 00:00
const HOURS_END = 24; // 24:00 (last grid line, exclusive top edge)
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

/**
 * Builds a single Google Maps directions URL that strings every stop of the
 * day together (origin → waypoints → destination). The 2-arg overload above
 * still powers leg-by-leg arrows; this one drives the "View full route" CTA.
 */
function buildFullDayDirectionsUrl(items: ScheduleItem[]): string | null {
  if (items.length < 2) return null;
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });
  const first = describeLocation(items[0]!);
  const last = describeLocation(items[items.length - 1]!);
  params.set('origin', first.query);
  if (first.placeId) params.set('origin_place_id', first.placeId);
  params.set('destination', last.query);
  if (last.placeId) params.set('destination_place_id', last.placeId);
  if (items.length > 2) {
    const middle = items.slice(1, -1).map((it) => describeLocation(it));
    params.set('waypoints', middle.map((m) => m.query).join('|'));
    const ids = middle.map((m) => m.placeId).filter((x): x is string => Boolean(x));
    if (ids.length === middle.length) {
      params.set('waypoint_place_ids', ids.join('|'));
    }
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Maps a free-text category (Google's `types` or our own enum) to a small
 * lucide icon. Falls back to a generic pin so unmatched categories still
 * render something meaningful.
 */
function categoryIconFor(category: string | null | undefined) {
  const c = (category ?? '').toLowerCase();
  if (/cafe|coffee/.test(c)) return Coffee;
  if (/bar|pub|night|club/.test(c)) return Wine;
  if (/restaurant|food|eat|dining|meal/.test(c)) return Utensils;
  if (/hotel|lodging|stay|hostel|resort/.test(c)) return Hotel;
  if (/museum|gallery|art|temple|shrine|church|landmark|monument/.test(c)) return Landmark;
  if (/park|garden|nature|forest/.test(c)) return TreePine;
  if (/mountain|hike|trek|trail|view/.test(c)) return Mountain;
  if (/shop|store|mall|market|boutique/.test(c)) return ShoppingBag;
  if (/sport|stadium|gym|arena/.test(c)) return Trophy;
  return MapPin;
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
  /**
   * Live preview while a drag is in flight. `startMinute` is what the drop
   * would commit if released right now; `durationMinutes` is the size of the
   * ghost block (new place → default, existing event → its own duration).
   * `conflict` is true when the proposed slot overlaps another scheduled
   * event — used to colour the ghost red and block the actual drop.
   * Reset on dragEnd / dragCancel.
   */
  const [dragPreview, setDragPreview] = useState<{
    startMinute: number;
    durationMinutes: number;
    conflict: boolean;
  } | null>(null);
  // Ref so `handleDragMove` can read the timeline DOM rect without re-creating
  // the callback on every render. Set by the Timeline component via callback.
  const timelineElRef = useRef<HTMLDivElement | null>(null);

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

  /**
   * Fires continuously while the pointer moves during a drag. We use it for
   * two things:
   *   1. Compute a live drop preview — the minute the event would land on if
   *      released now — and feed it to the Timeline so it can render a ghost
   *      block + time tooltip.
   *   2. Auto-scroll the page when the pointer nears the top or bottom edge
   *      of the timeline. Without this, a 24-hour timeline is unusable: you
   *      can't drag a 19:00 event into a 04:00 slot without releasing.
   */
  function handleDragMove(e: DragMoveEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    const tl = timelineElRef.current;
    if (!data || !tl) return;

    const activeRect = e.active.rect.current.translated;
    if (!activeRect) return;

    const timelineRect = tl.getBoundingClientRect();
    const yWithinTimeline = activeRect.top - timelineRect.top;
    const startMinute = pxToMinute(yWithinTimeline);

    // For existing events keep the original duration so the ghost matches the
    // block being moved; for new places the placeholder uses the default.
    const durationMinutes =
      data.kind === 'existing'
        ? (schedule ?? []).find((s) => s.id === data.scheduleId)?.durationMinutes ??
          DEFAULT_DURATION
        : DEFAULT_DURATION;

    // Overlap detection — interval is [start, start + duration). When moving
    // an existing event we exclude its own row from the check so the user
    // can drop it back where it already is without "self-conflict".
    const endMinute = startMinute + durationMinutes;
    const selfId = data.kind === 'existing' ? data.scheduleId : null;
    const conflict = (schedule ?? []).some((s) => {
      if (s.dayIndex !== activeDay) return false;
      if (s.id === selfId) return false;
      const sEnd = s.startMinute + s.durationMinutes;
      return startMinute < sEnd && endMinute > s.startMinute;
    });

    setDragPreview({ startMinute, durationMinutes, conflict });

    // Auto-scroll near the viewport edges. We use `window.scrollBy` because
    // the page's scroll container is the document (the TripLayout `<main>`
    // also scrolls, but document-level scrolling is what users actually feel
    // when dragging near the screen edges).
    const EDGE = 80; // px from edge where auto-scroll kicks in
    const MAX_SPEED = 18; // px per move event
    const cursorY = activeRect.top + activeRect.height / 2;
    const viewportH = window.innerHeight;
    let delta = 0;
    if (cursorY < EDGE) {
      delta = -Math.ceil(((EDGE - cursorY) / EDGE) * MAX_SPEED);
    } else if (cursorY > viewportH - EDGE) {
      delta = Math.ceil(((cursorY - (viewportH - EDGE)) / EDGE) * MAX_SPEED);
    }
    if (delta !== 0) {
      // Try the document first, then fall back to the layout's <main> if the
      // page doesn't scroll at the document level.
      const main = document.querySelector('main');
      if (main && main.scrollHeight > main.clientHeight) {
        main.scrollBy({ top: delta });
      } else {
        window.scrollBy({ top: delta });
      }
    }
  }

  async function handleDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    // Snapshot the conflict flag before we clear preview state — the drop
    // must respect what the user was seeing on the ghost at release time.
    const wasConflicting = dragPreview?.conflict === true;
    setDragging(null);
    setDragPreview(null);
    if (!id || !data) return;
    if (e.over?.id !== 'timeline') return;
    // Block the drop entirely if the live preview was red. dnd-kit doesn't
    // know about our domain rules, so we enforce them here.
    if (wasConflicting) return;

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

  /**
   * Commits a resized event back to the server. We optimistically update the
   * local cache first so the timeline doesn't snap back during the request;
   * if the PATCH fails we restore the previous value and log it.
   */
  async function handleResize(scheduleId: string, durationMinutes: number) {
    if (!id) return;
    const prev = schedule?.find((s) => s.id === scheduleId);
    if (!prev || prev.durationMinutes === durationMinutes) return;

    mutate((curr) =>
      (curr ?? []).map((s) =>
        s.id === scheduleId ? { ...s, durationMinutes } : s,
      ),
    );

    try {
      const updated = await updateSchedule(id, scheduleId, { durationMinutes });
      mutate((curr) =>
        (curr ?? []).map((s) => (s.id === scheduleId ? updated : s)),
      );
    } catch (err) {
      console.error('[schedule] resize failed', err);
      // Roll back to the pre-resize value on failure.
      mutate((curr) =>
        (curr ?? []).map((s) => (s.id === scheduleId ? prev : s)),
      );
    }
  }

  if (!id) return null;

  const activeDayMeta = days[activeDay];

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setDragging(null);
        setDragPreview(null);
      }}
    >
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
        <DayTabsScroller days={days} activeDay={activeDay} onSelect={setActiveDay} />

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
                onResize={handleResize}
                ghost={dragging?.kind === 'new' ? dragging : null}
                dragPreview={dragging ? dragPreview : null}
                timelineRef={(el) => {
                  timelineElRef.current = el;
                }}
              />
            )}
          </div>

          {/* Top voted sidebar — sticky on lg+ so it stays in view while the
              user scrolls a tall (24-hour) timeline. `self-start` is critical:
              without it the grid stretches the aside to the full row height,
              leaving sticky no room to move. */}
          <aside className="border-border bg-card rounded-2xl border p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
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

/* ------------------------------------------------------------------------ */
/*  Day tabs scroller                                                       */
/* ------------------------------------------------------------------------ */

interface DayTabsScrollerProps {
  days: DayInfo[];
  activeDay: number;
  onSelect: (index: number) => void;
}

/**
 * Horizontally scrolling day tab list with sticky prev/next chevrons.
 *
 * Long trips can have 20+ days — wrapping into a multi-line grid wastes
 * vertical space and forces the eye to ping-pong. Instead the list is a
 * single scrollable row; chevrons appear only when there's overflow on
 * that side, and the active tab auto-scrolls into view (centered) when it
 * changes.
 */
function DayTabsScroller({ days, activeDay, onSelect }: DayTabsScrollerProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  function recompute() {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  // Recompute on mount + whenever the list resizes (window resize, font load).
  useLayoutEffect(() => {
    recompute();
    const el = scrollerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(recompute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [days.length]);

  // Scroll the active tab into the center of the viewport on change.
  useEffect(() => {
    const node = tabRefs.current[activeDay];
    if (!node) return;
    node.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [activeDay]);

  function nudge(direction: 'left' | 'right') {
    const el = scrollerRef.current;
    if (!el) return;
    // Scroll by ~80% of the viewport so users see fresh tabs but keep some overlap.
    const delta = el.clientWidth * 0.8 * (direction === 'left' ? -1 : 1);
    el.scrollBy({ left: delta, behavior: 'smooth' });
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => nudge('left')}
        aria-label="Scroll days left"
        className={cn(
          'bg-card border-border absolute left-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-opacity',
          canScrollLeft ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
      </button>

      <div
        ref={scrollerRef}
        onScroll={recompute}
        className="scrollbar-none flex items-center gap-2 overflow-x-auto scroll-smooth px-8 pb-1"
      >
        {days.map((d, idx) => (
          <button
            key={d.index}
            ref={(node) => {
              tabRefs.current[idx] = node;
            }}
            type="button"
            onClick={() => onSelect(d.index)}
            className={cn(
              'inline-flex shrink-0 items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-semibold transition-colors',
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

      <button
        type="button"
        onClick={() => nudge('right')}
        aria-label="Scroll days right"
        className={cn(
          'bg-card border-border absolute right-0 top-1/2 z-10 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border shadow-md transition-opacity',
          canScrollRight ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
      >
        <ChevronRight className="h-4 w-4" strokeWidth={2.5} />
      </button>
    </div>
  );
}

interface TimelineProps {
  items: ScheduleItem[];
  onRemove: (scheduleId: string) => void;
  onResize: (scheduleId: string, durationMinutes: number) => void;
  ghost: ({ kind: 'new'; tripPlaceId: string }) | null;
  /** Snap-aligned preview of where the active drag would commit. */
  dragPreview:
    | { startMinute: number; durationMinutes: number; conflict: boolean }
    | null;
  /** Receives the timeline DOM node so the page can measure it during drag. */
  timelineRef: (el: HTMLDivElement | null) => void;
}

function Timeline({
  items,
  onRemove,
  onResize,
  dragPreview,
  timelineRef,
}: TimelineProps) {
  const { setNodeRef, isOver } = useDroppable({ id: 'timeline' });

  const hourLines = Array.from({ length: HOURS_END - HOURS_START + 1 }, (_, i) => HOURS_START + i);

  // Combine dnd-kit's droppable ref with our page-level ref so we can both
  // register with dnd-kit AND measure the rect during a drag.
  const composedRef = (el: HTMLDivElement | null) => {
    setNodeRef(el);
    timelineRef(el);
  };

  return (
    <div
      ref={composedRef}
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
            onResize={(duration) => onResize(item.id, duration)}
          />
        );
      })}

      {/* Live drop preview — outline-only block + time tooltip pinned to its
          top edge. Shown only while a drag is in progress AND the pointer
          has produced a snap target inside this droppable. */}
      {dragPreview && <DropPreview preview={dragPreview} />}

      {/* Empty hint */}
      {items.length === 0 && (
        <div className="text-muted-foreground absolute inset-0 flex items-center justify-center text-sm">
          Drag a place here to start scheduling.
        </div>
      )}
    </div>
  );
}

/**
 * Outline-only ghost block + floating time chip rendered at the snap target
 * during a drag. Pointer-events-none so it never absorbs the drop. Turns red
 * when the proposed slot overlaps an existing event — the matching chip text
 * tells the user the drop will be ignored.
 */
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
        conflict
          ? 'border-destructive bg-destructive/10'
          : 'border-primary bg-primary/10',
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

/* ------------------------------------------------------------------------ */
/*  Event block                                                             */
/* ------------------------------------------------------------------------ */

/**
 * Single shared tone for every event block + route-flow step. Solid primary
 * background makes each scheduled stop pop against the neutral timeline
 * grid; text uses primary-foreground (the theme's high-contrast pair).
 */
const TONE = {
  bg: 'bg-primary',
  border: 'border-primary',
  bar: 'bg-primary-foreground/80',
  text: 'text-primary-foreground',
} as const;

function toneFor(_scheduleId: string) {
  return TONE;
}

interface EventBlockProps {
  item: ScheduleItem;
  next: ScheduleItem | undefined;
  onRemove: () => void;
  onResize: (durationMinutes: number) => void;
}

/** Minimum slot a user can shrink an event down to (in minutes). */
const MIN_DURATION_MINUTES = 15;
/** Resize snap step — matches the drop snap so create + resize feel uniform. */
const RESIZE_STEP_MINUTES = 15;

function EventBlock({ item, next, onRemove, onResize }: EventBlockProps) {
  const top = minuteToPx(item.startMinute);
  const tone = toneFor(item.id);

  // Local override during an active resize drag. While set, this drives the
  // block's height and the time label so the user sees the new duration
  // immediately; on pointer-up we hand it off to `onResize` and clear the
  // local state so the SWR-cached value becomes the source of truth again.
  const [draftDuration, setDraftDuration] = useState<number | null>(null);
  const effectiveDuration = draftDuration ?? item.durationMinutes;
  const height = (effectiveDuration / 60) * HOUR_HEIGHT_PX;
  const isResizing = draftDuration !== null;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `event-${item.id}`,
    data: { kind: 'existing', scheduleId: item.id } satisfies DragPayload,
    disabled: isResizing,
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

  /**
   * Begins a resize gesture. We capture the pointer on the handle itself so
   * the user can drag fast past the timeline edge without losing the event
   * stream. Snap math mirrors the create-flow (`snapMinute`) so a 1h block
   * resized to "about 90m" lands exactly on 90m.
   */
  function handleResizePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.stopPropagation();
    e.preventDefault();
    const handle = e.currentTarget;
    handle.setPointerCapture(e.pointerId);

    const startY = e.clientY;
    const startDuration = item.durationMinutes;
    let latest = startDuration;

    // Ceiling for this resize: the next event's start (so we never overlap),
    // or end-of-day if this is the last event. Captured once at drag start —
    // adjacent events don't move while the user resizes.
    const ceilingMinute =
      next !== undefined ? next.startMinute : HOURS_END * 60;
    const maxDuration = ceilingMinute - item.startMinute;

    const onMove = (ev: PointerEvent) => {
      const dyPx = ev.clientY - startY;
      const dyMinutes = (dyPx / HOUR_HEIGHT_PX) * 60;
      const raw = startDuration + dyMinutes;
      const snapped =
        Math.round(raw / RESIZE_STEP_MINUTES) * RESIZE_STEP_MINUTES;
      // Clamp: can't shrink below MIN_DURATION, can't grow past the next
      // event's start (or end-of-day if there is no next event).
      const nextDuration = Math.max(
        MIN_DURATION_MINUTES,
        Math.min(maxDuration, snapped),
      );
      latest = nextDuration;
      setDraftDuration(nextDuration);
    };

    const onUp = () => {
      handle.removeEventListener('pointermove', onMove);
      handle.removeEventListener('pointerup', onUp);
      handle.removeEventListener('pointercancel', onUp);
      setDraftDuration(null);
      if (latest !== startDuration) onResize(latest);
    };

    handle.addEventListener('pointermove', onMove);
    handle.addEventListener('pointerup', onUp);
    handle.addEventListener('pointercancel', onUp);
  }

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
          isResizing && 'ring-primary/60 ring-2',
        )}
      >
        <div className="min-w-0 flex-1">
          <p className={cn('truncate text-sm font-bold', tone.text)}>{item.place.name}</p>
          <p className="text-primary-foreground/80 mt-0.5 truncate text-xs">
            {formatTime(item.startMinute)} -{' '}
            {formatTime(item.startMinute + effectiveDuration)}
            <span className="ml-1 opacity-70">({formatDuration(effectiveDuration)})</span>
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
          className="text-primary-foreground/70 hover:text-destructive-foreground hover:bg-destructive inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md transition-colors"
        >
          <Trash2 className="h-3.5 w-3.5" strokeWidth={1.75} />
        </button>

        {/* Resize handle — sits at the bottom edge of the block. Stops both
            drag and click propagation so it never triggers the dnd-kit
            draggable on the parent. The visible grip thickens on hover. */}
        <div
          role="slider"
          aria-label="Resize event duration"
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

      {/* Travel gap chip between adjacent events — uses effective duration so
          the gap label updates live while the user is resizing. */}
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
        {place.openingHoursText && (
          <p className="text-muted-foreground mt-0.5 truncate text-xs">
            {place.openingHoursText}
          </p>
        )}
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
    return <RouteFlowEmpty />;
  }

  // Summary stats for the header strip. `activeMinutes` = sum of stop
  // durations (not span), so big gaps don't inflate the "active" number.
  const activeMinutes = items.reduce((sum, it) => sum + it.durationMinutes, 0);
  const firstStart = items[0]!.startMinute;
  const lastEnd =
    items[items.length - 1]!.startMinute + items[items.length - 1]!.durationMinutes;
  const fullRouteUrl = buildFullDayDirectionsUrl(items);

  return (
    <div className="border-border bg-card rounded-2xl border p-4">
      {/* Header: title + stats + view-route CTA */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h3 className="text-foreground text-xs font-bold uppercase tracking-wide">
            Route flow
          </h3>
          <span className="bg-primary/10 text-primary rounded-full px-2 py-0.5 text-[0.65rem] font-semibold">
            {items.length} {items.length === 1 ? 'stop' : 'stops'}
          </span>
        </div>
        <div className="text-muted-foreground flex items-center gap-3 text-[0.7rem] tabular-nums">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" strokeWidth={2.25} />
            {formatDuration(activeMinutes)} active
          </span>
          <span className="hidden sm:inline">
            {formatTime(firstStart)} → {formatTime(lastEnd)}
          </span>
          {fullRouteUrl && (
            <a
              href={fullRouteUrl}
              target="_blank"
              rel="noreferrer"
              title="Open the full day's route in Google Maps"
              className="border-border hover:bg-muted hover:text-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.65rem] font-semibold transition-colors"
            >
              <MapIcon className="h-3 w-3" strokeWidth={2.25} />
              View route
            </a>
          )}
        </div>
      </div>

      {/* Horizontal scroll on narrow viewports — keeps long days legible without wrapping.
          `items-stretch` makes every step card the same height regardless of content. */}
      <div className="scrollbar-none -mx-1 flex items-stretch gap-1 overflow-x-auto px-1 pb-1">
        {items.map((item, idx) => (
          <RouteFlowStep
            key={item.id}
            index={idx}
            total={items.length}
            item={item}
            next={items[idx + 1]}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Empty state — instead of a single line of text, sketch a ghost A → B → C so
 * the user can see what the card will look like once they drop stops in.
 */
function RouteFlowEmpty() {
  return (
    <div className="border-border bg-card rounded-2xl border border-dashed p-5">
      <div className="text-muted-foreground mb-3 text-center text-xs">
        Your route flow will appear here once you schedule stops for the day.
      </div>
      <div className="flex items-center justify-center gap-2 opacity-50">
        {['A', 'B', 'C'].map((letter, idx) => (
          <div key={letter} className="flex items-center gap-2">
            <div className="border-border bg-muted/40 flex h-10 w-20 items-center gap-1.5 rounded-lg border px-2">
              <span className="bg-muted text-muted-foreground inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.65rem] font-bold">
                {letter}
              </span>
              <div className="bg-muted h-1.5 flex-1 rounded-full" />
            </div>
            {idx < 2 && (
              <svg
                viewBox="0 0 32 8"
                className="text-muted-foreground h-2 w-6"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M2 4 H 30" strokeDasharray="3 3" />
              </svg>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

interface RouteFlowStepProps {
  index: number;
  total: number;
  item: ScheduleItem;
  next: ScheduleItem | undefined;
}

function RouteFlowStep({ index, total, item, next }: RouteFlowStepProps) {
  const tone = toneFor(item.id);
  const Icon = categoryIconFor(item.place.category);
  const isFirst = index === 0;
  const isLast = index === total - 1;

  // Start/end pins replace the numeric badge for the first and last stops.
  // Visually evokes a "race route" — clear anchors at both ends.
  const Pin = isFirst ? Flag : isLast ? FlagTriangleRight : null;

  return (
    <>
      <div className="group/step relative flex shrink-0 items-stretch">
        <div
          className={cn(
            'flex h-full min-w-[12rem] max-w-[16rem] items-center gap-2.5 rounded-xl border p-2 transition-shadow',
            tone.bg,
            tone.border,
            'hover:shadow-md',
          )}
        >
          {/* Thumbnail — falls back to a category icon tile if the place has no photo. */}
          {item.place.photoUrl ? (
            <div className="relative h-12 w-12 shrink-0">
              <img
                src={item.place.photoUrl}
                alt=""
                loading="lazy"
                className="h-12 w-12 rounded-lg object-cover"
              />
              <span
                className={cn(
                  'bg-primary-foreground text-primary ring-primary absolute -left-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold shadow ring-2',
                )}
              >
                {Pin ? <Pin className="h-3 w-3" strokeWidth={2.5} /> : index + 1}
              </span>
            </div>
          ) : (
            <div className="bg-primary-foreground text-primary relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg">
              <Icon className="h-5 w-5" strokeWidth={2} />
              <span
                className={cn(
                  'bg-primary-foreground text-primary ring-primary absolute -left-1 -top-1 inline-flex h-5 w-5 items-center justify-center rounded-full text-[0.6rem] font-bold shadow ring-2',
                )}
              >
                {Pin ? <Pin className="h-3 w-3" strokeWidth={2.5} /> : index + 1}
              </span>
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <Icon
                className={cn('h-3 w-3 shrink-0', tone.text)}
                strokeWidth={2.25}
                aria-hidden
              />
              <span className={cn('truncate text-xs font-semibold', tone.text)}>
                {item.place.name}
              </span>
            </div>
            <p className="text-primary-foreground/80 mt-0.5 text-[0.65rem] tabular-nums">
              {formatTime(item.startMinute)} · {formatDuration(item.durationMinutes)}
            </p>
          </div>
        </div>

        {/* Hover tooltip — bigger thumbnail + hours, anchored above the card.
            Pointer-events-none so it never steals hover from the step. */}
        <div className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 w-56 -translate-x-1/2 opacity-0 transition-opacity duration-150 group-hover/step:opacity-100">
          <div className="border-border bg-popover text-popover-foreground rounded-lg border p-2 shadow-lg">
            <div className="flex gap-2">
              {item.place.photoUrl ? (
                <img
                  src={item.place.photoUrl}
                  alt=""
                  className="h-14 w-14 shrink-0 rounded-md object-cover"
                />
              ) : (
                <div
                  className={cn(
                    'flex h-14 w-14 shrink-0 items-center justify-center rounded-md text-white',
                    tone.bar,
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={2} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold">{item.place.name}</p>
                <p className="text-muted-foreground mt-0.5 text-[0.65rem] tabular-nums">
                  {formatTime(item.startMinute)} –{' '}
                  {formatTime(item.startMinute + item.durationMinutes)}
                </p>
                {item.place.openingHoursText && (
                  <p className="text-muted-foreground mt-0.5 truncate text-[0.65rem]">
                    {item.place.openingHoursText}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {next && (
        <RouteFlowConnector
          from={item}
          to={next}
          gapMinutes={Math.max(0, next.startMinute - (item.startMinute + item.durationMinutes))}
        />
      )}
    </>
  );
}

interface RouteFlowConnectorProps {
  from: ScheduleItem;
  to: ScheduleItem;
  gapMinutes: number;
}

/**
 * Animated dashed line between two stops. The SVG path uses
 * `stroke-dasharray` + the `route-flow-dash` keyframe to "flow" from left to
 * right, evoking a moving map route. Clicking opens turn-by-turn directions
 * in Google Maps.
 */
function RouteFlowConnector({ from, to, gapMinutes }: RouteFlowConnectorProps) {
  return (
    <a
      href={buildMapsDirectionsUrl(from, to)}
      target="_blank"
      rel="noreferrer"
      title={`Open directions from ${from.place.name} to ${to.place.name}`}
      className="text-muted-foreground/70 hover:text-primary group/arrow relative flex shrink-0 flex-col items-center self-start px-1 pt-5"
      style={{ minWidth: '3rem' }}
    >
      <svg
        viewBox="0 0 48 12"
        className="h-3 w-12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        aria-hidden
      >
        {/* Dashed flowing path — animated via CSS. */}
        <path
          d="M2 6 H 38"
          strokeDasharray="4 4"
          style={{ animation: 'route-flow-dash 0.9s linear infinite' }}
        />
        {/* Arrow head */}
        <path d="M36 2 L42 6 L36 10" strokeLinejoin="round" />
      </svg>
      <span className="mt-0.5 text-[0.6rem] tabular-nums">
        {gapMinutes > 0 ? `+${formatDuration(gapMinutes)}` : '—'}
      </span>
    </a>
  );
}
