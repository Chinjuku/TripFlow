import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragMoveEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Skeleton } from '@trip-flow/ui/components/skeleton';
import { TripPageHeader } from '@/components/shared/TripPageHeader';
import { useTrip } from '@/components/feat/trips';
import { useTripPlaces, type TripPlace } from '@/components/feat/places';
import { useTranslation } from 'react-i18next';
import {
  addSchedule,
  buildDays,
  DayTabsScroller,
  DedupeConfirmModal,
  DEFAULT_DURATION,
  DraggablePlace,
  DuplicateModeToggle,
  PlacePill,
  removeSchedule,
  RouteFlowCard,
  Timeline,
  updateSchedule,
  useSchedule,
  pxToMinute,
  type DragPayload,
  type ScheduleItem,
} from '@/components/feat/schedule';

export default function TripSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { data: trip } = useTrip(id);
  const { data: places } = useTripPlaces(id);
  const { data: schedule, mutate, error, isLoading } = useSchedule(id);

  const days = useMemo(() => (trip ? buildDays(trip.startsOn, trip.endsOn) : []), [trip]);
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeDay, setActiveDay] = useState(() => {
    const day = searchParams.get('day');
    if (!day) return 0;
    const parsed = parseInt(day, 10);
    return isNaN(parsed) ? 0 : parsed;
  });

  useEffect(() => {
    const day = searchParams.get('day');
    if (day) {
      const parsed = parseInt(day, 10);
      if (!isNaN(parsed) && parsed !== activeDay) {
        setActiveDay(parsed);
      }
    }
  }, [searchParams, activeDay]);

  const handleSelectDay = (index: number) => {
    setActiveDay(index);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('day', String(index));
        return next;
      },
      { replace: true },
    );
  };
  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dragPreview, setDragPreview] = useState<{
    startMinute: number;
    durationMinutes: number;
    conflict: boolean;
  } | null>(null);
  const timelineElRef = useRef<HTMLDivElement | null>(null);
  const [pendingResizeIds, setPendingResizeIds] = useState<Set<string>>(() => new Set());
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [pendingDedupe, setPendingDedupe] = useState<ScheduleItem[] | null>(null);

  const placesById = useMemo(() => {
    const map = new Map<string, TripPlace>();
    for (const p of places ?? []) map.set(p.id, p);
    return map;
  }, [places]);

  const itemsForDay = useMemo(
    () =>
      (schedule ?? [])
        .filter((s) => s.dayIndex === activeDay)
        .sort((a, b) => a.startMinute - b.startMinute),
    [schedule, activeDay],
  );

  const topVotedForDay = useMemo(() => {
    const usedIds = new Set(
      (schedule ?? [])
        .filter((s) => (allowDuplicates ? s.dayIndex === activeDay : true))
        .map((s) => s.tripPlaceId),
    );
    return (places ?? [])
      .filter((p) => !usedIds.has(p.id))
      .sort((a, b) => {
        if (b.voteCount !== a.voteCount) return b.voteCount - a.voteCount;
        return a.createdAt.localeCompare(b.createdAt);
      });
  }, [places, schedule, activeDay, allowDuplicates]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function handleDragStart(e: DragStartEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    if (data) setDragging(data);
  }

  function handleDragMove(e: DragMoveEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    const tl = timelineElRef.current;
    if (!data || !tl) return;

    const activeRect = e.active.rect.current.translated;
    if (!activeRect) return;

    const timelineRect = tl.getBoundingClientRect();
    const yWithinTimeline = activeRect.top - timelineRect.top;
    const startMinute = pxToMinute(yWithinTimeline);

    let durationMinutes: number;
    if (data.kind === 'existing') {
      durationMinutes =
        (schedule ?? []).find((s) => s.id === data.scheduleId)?.durationMinutes ?? DEFAULT_DURATION;
    } else {
      const place = placesById.get(data.tripPlaceId);
      durationMinutes = place?.stayMinutes || DEFAULT_DURATION;
    }

    const endMinute = startMinute + Math.max(1, durationMinutes);
    const selfId = data.kind === 'existing' ? data.scheduleId : null;
    const conflict = (schedule ?? []).some((s) => {
      if (s.dayIndex !== activeDay) return false;
      if (s.id === selfId) return false;
      const sEnd = s.startMinute + s.durationMinutes;
      return startMinute < sEnd && endMinute > s.startMinute;
    });

    setDragPreview({ startMinute, durationMinutes, conflict });
  }

  async function handleDragEnd(e: DragEndEvent) {
    const data = e.active.data.current as DragPayload | undefined;
    const wasConflicting = dragPreview?.conflict === true;
    setDragging(null);
    setDragPreview(null);
    if (!id || !data) return;
    if (e.over?.id !== 'timeline') return;
    if (wasConflicting) return;

    const overRect = e.over.rect;
    const activeRect = e.active.rect.current.translated;
    if (!overRect || !activeRect) return;

    const yWithinTimeline = activeRect.top - overRect.top;
    const startMinute = pxToMinute(yWithinTimeline);

    let durationMinutes: number;
    if (data.kind === 'new') {
      const place = placesById.get(data.tripPlaceId);
      durationMinutes = place?.stayMinutes || DEFAULT_DURATION;
    } else {
      durationMinutes =
        (schedule ?? []).find((s) => s.id === data.scheduleId)?.durationMinutes ?? DEFAULT_DURATION;
    }

    const endMinute = startMinute + Math.max(1, durationMinutes);
    const selfId = data.kind === 'existing' ? data.scheduleId : null;
    const conflictNow = (schedule ?? []).some((s) => {
      if (s.dayIndex !== activeDay) return false;
      if (s.id === selfId) return false;
      const sEnd = s.startMinute + s.durationMinutes;
      return startMinute < sEnd && endMinute > s.startMinute;
    });
    if (conflictNow) return;

    try {
      if (data.kind === 'new') {
        const created = await addSchedule(id, {
          tripPlaceId: data.tripPlaceId,
          dayIndex: activeDay,
          startMinute,
          durationMinutes,
        });
        mutate((prev) => [...(prev ?? []), created]);
      } else {
        const updated = await updateSchedule(id, data.scheduleId, {
          startMinute,
          dayIndex: activeDay,
        });
        mutate((prev) => (prev ?? []).map((s) => (s.id === data.scheduleId ? updated : s)));
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

  function handleModeChange(nextAllow: boolean) {
    if (nextAllow) {
      setAllowDuplicates(true);
      return;
    }
    const byPlace = new Map<string, ScheduleItem[]>();
    for (const s of schedule ?? []) {
      const list = byPlace.get(s.tripPlaceId) ?? [];
      list.push(s);
      byPlace.set(s.tripPlaceId, list);
    }
    const extras: ScheduleItem[] = [];
    for (const rows of byPlace.values()) {
      if (rows.length <= 1) continue;
      const sorted = [...rows].sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      extras.push(...sorted.slice(1));
    }
    if (extras.length === 0) {
      setAllowDuplicates(false);
      return;
    }
    setPendingDedupe(extras);
  }

  async function confirmDedupe() {
    if (!id || !pendingDedupe) return;
    const toRemove = pendingDedupe;
    setPendingDedupe(null);
    try {
      for (const row of toRemove) {
        await removeSchedule(id, row.id);
        mutate((prev) => (prev ?? []).filter((s) => s.id !== row.id));
      }
      setAllowDuplicates(false);
    } catch (err) {
      console.error('[schedule] dedupe failed', err);
    }
  }

  async function handleResize(scheduleId: string, durationMinutes: number) {
    if (!id) return;
    const prev = schedule?.find((s) => s.id === scheduleId);
    if (!prev || prev.durationMinutes === durationMinutes) return;

    mutate((curr) =>
      (curr ?? []).map((s) => (s.id === scheduleId ? { ...s, durationMinutes } : s)),
    );
    setPendingResizeIds((curr) => {
      const next = new Set(curr);
      next.add(scheduleId);
      return next;
    });

    try {
      const updated = await updateSchedule(id, scheduleId, { durationMinutes });
      mutate((curr) => (curr ?? []).map((s) => (s.id === scheduleId ? updated : s)));
    } catch (err) {
      console.error('[schedule] resize failed', err);
      mutate((curr) => (curr ?? []).map((s) => (s.id === scheduleId ? prev : s)));
    } finally {
      setPendingResizeIds((curr) => {
        if (!curr.has(scheduleId)) return curr;
        const next = new Set(curr);
        next.delete(scheduleId);
        return next;
      });
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
      autoScroll={{ threshold: { x: 0, y: 0.2 }, acceleration: 12 }}
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-6">
        <TripPageHeader
          backTo={`/trips/${id}`}
          backLabel={t('overview.tripOverview')}
          title={t('schedule.title', 'Trip Schedule')}
          subtitle={t(
            'schedule.subtitle',
            'Drag voted places onto the timeline to build each day.',
          )}
          withBorder
        />

        <DayTabsScroller days={days} activeDay={activeDay} onSelect={handleSelectDay} />

        {error && (
          <div className="border-destructive/30 bg-destructive/10 text-destructive rounded-lg border p-4 text-sm">
            {error.message}
          </div>
        )}

        <RouteFlowCard items={itemsForDay} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
          <div className="border-border bg-card rounded-2xl border p-5">
            <div className="border-border mb-4 border-b pb-3">
              <h2 className="text-foreground font-headline text-lg font-bold">
                {activeDayMeta
                  ? `${activeDayMeta.date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' })} (${activeDayMeta.label})`
                  : t('schedule.dayFallback', 'Day')}
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
                pendingResizeIds={pendingResizeIds}
                timelineRef={(el) => {
                  timelineElRef.current = el;
                }}
              />
            )}
          </div>

          <aside className="border-border bg-card rounded-2xl border p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start lg:overflow-y-auto">
            <div className="border-border mb-3 flex items-center justify-between gap-2 border-b pb-3">
              <h3 className="text-foreground font-headline text-base font-bold">
                {t('schedule.topVotedPlaces', 'Top Voted Places')}
              </h3>
              <span className="bg-primary/10 text-primary rounded-full px-2.5 py-0.5 text-xs font-semibold">
                {t('schedule.itemsCount', '{{count}} items', { count: topVotedForDay.length })}
              </span>
            </div>

            <DuplicateModeToggle value={allowDuplicates} onChange={handleModeChange} />

            <p className="text-muted-foreground mb-4 mt-3 text-xs">
              {allowDuplicates
                ? t(
                    'schedule.allowDuplicatesOn',
                    'A place can repeat across days — handy for daily stops.',
                  )
                : t(
                    'schedule.allowDuplicatesOff',
                    'Each place appears once across the whole trip.',
                  )}
            </p>

            {topVotedForDay.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                {t('schedule.noMoreCandidates', 'No more candidates left to schedule.')}
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

      <DragOverlay>
        {dragging?.kind === 'new' && placesById.get(dragging.tripPlaceId) ? (
          <PlacePill place={placesById.get(dragging.tripPlaceId)!} dragging />
        ) : dragging?.kind === 'existing' ? (
          <div className="bg-primary/90 text-primary-foreground rounded-md px-3 py-2 text-sm font-semibold shadow-lg">
            {t('schedule.movingEvent', 'Moving event…')}
          </div>
        ) : null}
      </DragOverlay>

      <DedupeConfirmModal
        rows={pendingDedupe}
        onCancel={() => setPendingDedupe(null)}
        onConfirm={confirmDedupe}
      />
    </DndContext>
  );
}
