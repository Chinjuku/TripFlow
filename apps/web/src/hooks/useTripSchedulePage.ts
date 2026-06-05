import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { DragEndEvent, DragMoveEvent, DragStartEvent } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { addSchedule, removeSchedule, updateSchedule } from '@/api/schedule';
import { buildDays, DEFAULT_DURATION, pxToMinute } from '@/utils/schedule';
import { bucketFor } from '@/utils/places';
import { useSchedule } from '@/hooks/useSchedule';
import { useTripPlaces } from '@/hooks/usePlaces';
import { useTrip } from '@/hooks/useTrips';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { DragPayload, ScheduleItem } from '@/types/schedule';
import type { TripPlace, PlaceBucket } from '@/types/places';

interface DragPreview {
  startMinute: number;
  durationMinutes: number;
  conflict: boolean;
}

/** True when [startMinute, endMinute) overlaps any other item on `dayIndex`. */
function overlaps(
  schedule: ScheduleItem[],
  dayIndex: number,
  startMinute: number,
  endMinute: number,
  selfId: string | null,
): boolean {
  return schedule.some((s) => {
    if (s.dayIndex !== dayIndex) return false;
    if (s.id === selfId) return false;
    const sEnd = s.startMinute + s.durationMinutes;
    return startMinute < sEnd && endMinute > s.startMinute;
  });
}

/**
 * All state, drag-and-drop math, and mutation handlers for the trip schedule
 * page. The page consumes this and renders the timeline + sidebar + sheets.
 */
export function useTripSchedulePage(id: string | undefined) {
  const { t, i18n } = useTranslation();
  const { data: trip } = useTrip(id);
  const { data: places } = useTripPlaces(id);
  const { data: schedule, mutate, error, isLoading } = useSchedule(id);

  const days = useMemo(
    () => (trip ? buildDays(trip.startsOn, trip.endsOn, t, i18n.language) : []),
    [trip, t, i18n.language],
  );

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
      if (!isNaN(parsed) && parsed !== activeDay) setActiveDay(parsed);
    }
  }, [searchParams, activeDay]);

  function handleSelectDay(index: number) {
    setActiveDay(index);
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('day', String(index));
        return next;
      },
      { replace: true },
    );
  }

  const [dragging, setDragging] = useState<DragPayload | null>(null);
  const [dragPreview, setDragPreview] = useState<DragPreview | null>(null);
  const timelineElRef = useRef<HTMLDivElement | null>(null);
  const [pendingResizeIds, setPendingResizeIds] = useState<Set<string>>(() => new Set());
  const [allowDuplicates, setAllowDuplicates] = useState(false);
  const [pendingDedupe, setPendingDedupe] = useState<ScheduleItem[] | null>(null);

  const isMobile = useMediaQuery('(max-width: 639px)');
  const [pickPlace, setPickPlace] = useState<TripPlace | null>(null);
  const [editEvent, setEditEvent] = useState<ScheduleItem | null>(null);

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

  // Group the schedulable places by category so the sidebar can show a heading
  // per bucket. Groups are ordered by their strongest pick's vote count.
  const topVotedGroups = useMemo(() => {
    const byBucket = new Map<PlaceBucket, TripPlace[]>();
    for (const p of topVotedForDay) {
      const b = bucketFor(p.category);
      const list = byBucket.get(b) ?? [];
      list.push(p);
      byBucket.set(b, list);
    }
    return [...byBucket.entries()]
      .map(([bucket, items]) => ({ bucket, items }))
      .sort((a, b) => (b.items[0]?.voteCount ?? 0) - (a.items[0]?.voteCount ?? 0));
  }, [topVotedForDay]);

  function durationForPayload(data: DragPayload): number {
    if (data.kind === 'existing') {
      return (
        (schedule ?? []).find((s) => s.id === data.scheduleId)?.durationMinutes ?? DEFAULT_DURATION
      );
    }
    return placesById.get(data.tripPlaceId)?.stayMinutes || DEFAULT_DURATION;
  }

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
    const startMinute = pxToMinute(activeRect.top - timelineRect.top);
    const durationMinutes = durationForPayload(data);
    const endMinute = startMinute + Math.max(1, durationMinutes);
    const selfId = data.kind === 'existing' ? data.scheduleId : null;
    const conflict = overlaps(schedule ?? [], activeDay, startMinute, endMinute, selfId);

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

    const startMinute = pxToMinute(activeRect.top - overRect.top);
    const durationMinutes = durationForPayload(data);
    const endMinute = startMinute + Math.max(1, durationMinutes);
    const selfId = data.kind === 'existing' ? data.scheduleId : null;
    if (overlaps(schedule ?? [], activeDay, startMinute, endMinute, selfId)) return;

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

  async function handleAddFromSheet(input: { startMinute: number; durationMinutes: number }) {
    if (!id || !pickPlace) return;
    try {
      const created = await addSchedule(id, {
        tripPlaceId: pickPlace.id,
        dayIndex: activeDay,
        startMinute: input.startMinute,
        durationMinutes: input.durationMinutes,
      });
      mutate((prev) => [...(prev ?? []), created]);
      setPickPlace(null);
    } catch (err) {
      console.error('[schedule] add from sheet failed', err);
    }
  }

  async function handleSaveFromSheet(input: { startMinute: number; durationMinutes: number }) {
    if (!id || !editEvent) return;
    try {
      const updated = await updateSchedule(id, editEvent.id, {
        startMinute: input.startMinute,
        durationMinutes: input.durationMinutes,
      });
      mutate((prev) => (prev ?? []).map((s) => (s.id === editEvent.id ? updated : s)));
      setEditEvent(null);
    } catch (err) {
      console.error('[schedule] save from sheet failed', err);
    }
  }

  async function handleRemoveFromSheet() {
    if (!id || !editEvent) return;
    try {
      await removeSchedule(id, editEvent.id);
      mutate((prev) => (prev ?? []).filter((s) => s.id !== editEvent.id));
      setEditEvent(null);
    } catch (err) {
      console.error('[schedule] remove from sheet failed', err);
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

  function cancelDrag() {
    setDragging(null);
    setDragPreview(null);
  }

  return {
    // data + meta
    trip,
    places,
    schedule,
    error,
    isLoading,
    isMobile,
    days,
    activeDay,
    handleSelectDay,
    // derived
    itemsForDay,
    topVotedForDay,
    topVotedGroups,
    placesById,
    // drag state
    dragging,
    dragPreview,
    timelineElRef,
    pendingResizeIds,
    handleDragStart,
    handleDragMove,
    handleDragEnd,
    cancelDrag,
    // duplicates
    allowDuplicates,
    handleModeChange,
    pendingDedupe,
    setPendingDedupe,
    confirmDedupe,
    // resize + remove
    handleResize,
    handleRemove,
    // sheets
    pickPlace,
    setPickPlace,
    editEvent,
    setEditEvent,
    handleAddFromSheet,
    handleSaveFromSheet,
    handleRemoveFromSheet,
  };
}
