import {
  Coffee,
  Hotel,
  Landmark,
  MapPin,
  Mountain,
  ShoppingBag,
  TreePine,
  Trophy,
  Utensils,
  Wine,
} from 'lucide-react';
import type { DayInfo, ScheduleItem } from '@/types/schedule';
import { formatLocalizedDate } from '@/lib/utils';

export const HOURS_START = 0;
export const HOURS_END = 24;
export const HOUR_HEIGHT_PX = 56;
export const TIMELINE_HEIGHT_PX = (HOURS_END - HOURS_START) * HOUR_HEIGHT_PX;
export const DEFAULT_DURATION = 90;
export const DAY_MS = 24 * 60 * 60 * 1000;

export const MIN_DURATION_MINUTES = 15;
export const RESIZE_STEP_MINUTES = 15;

export function buildDays(startsOn: string, endsOn: string, t?: any, lng?: string): DayInfo[] {
  const start = new Date(startsOn);
  const end = new Date(endsOn);
  const count = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS) + 1);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    return {
      index: i,
      date,
      label: t ? t('schedule.day', 'Day {{number}}', { number: i + 1 }) : `Day ${i + 1}`,
      subLabel: formatLocalizedDate(date, lng || 'en', { month: 'short', day: 'numeric' }),
    };
  });
}

export function formatTime(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem === 0 ? `${h}h` : `${h}h ${rem}m`;
}

export function snapMinute(minute: number, step = 15): number {
  return Math.max(HOURS_START * 60, Math.round(minute / step) * step);
}

export function pxToMinute(px: number): number {
  return snapMinute(HOURS_START * 60 + (px / HOUR_HEIGHT_PX) * 60);
}

export function minuteToPx(minute: number): number {
  return ((minute - HOURS_START * 60) / 60) * HOUR_HEIGHT_PX;
}

function isGooglePlaceId(value: string | null | undefined): value is string {
  if (!value || value.length < 10) return false;
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(value)) return false;
  return true;
}

function describeLocation(item: ScheduleItem): { query: string; placeId?: string } {
  const place = item.place;
  const placeId = isGooglePlaceId(place.externalId) ? place.externalId : undefined;
  if (place.lat !== null && place.lng !== null) {
    return { query: `${place.lat},${place.lng}`, placeId };
  }
  return { query: place.name, placeId };
}

export function buildMapsDirectionsUrl(from: ScheduleItem, to: ScheduleItem): string {
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });
  const origin = describeLocation(from);
  const destination = describeLocation(to);
  params.set('origin', origin.query);
  if (origin.placeId) params.set('origin_place_id', origin.placeId);
  params.set('destination', destination.query);
  if (destination.placeId) params.set('destination_place_id', destination.placeId);
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

export function buildFullDayDirectionsUrl(items: ScheduleItem[]): string | null {
  if (items.length === 0) return null;
  const params = new URLSearchParams({ api: '1', travelmode: 'driving' });

  if (items.length === 1) {
    const single = describeLocation(items[0]!);
    params.set('destination', single.query);
    if (single.placeId) params.set('destination_place_id', single.placeId);
    return `https://www.google.com/maps/dir/?${params.toString()}`;
  }

  const first = describeLocation(items[0]!);
  params.set('origin', first.query);
  if (first.placeId) params.set('origin_place_id', first.placeId);

  const last = describeLocation(items[items.length - 1]!);
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

export function categoryIconFor(category: string | null | undefined) {
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

export const TONE = {
  bg: 'bg-primary',
  border: 'border-primary',
  bar: 'bg-primary-foreground/80',
  text: 'text-primary-foreground',
} as const;

export type Tone = typeof TONE;

export function toneFor(_scheduleId: string): Tone {
  return TONE;
}

/* -------------------------------------------------------------------------- */
/*  Opening-hours check                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Whether a scheduled event fits the place's opening hours on its day:
 * - `open`    — the whole event falls inside an open window
 * - `partial` — the event starts open but runs past close (or starts before open)
 * - `closed`  — the place isn't open at all during the event
 * - `unknown` — no hours data (older rows / always-open) → don't warn
 */
export type OpeningStatus = 'open' | 'partial' | 'closed' | 'unknown';

/** "HH:MM" (or "26:00" for past-midnight) → minutes since that day's 00:00. */
function hhmmToMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/**
 * Checks an event against the place's weekly hours. `weekday` is 0=Sun..6=Sat
 * (use the event's real calendar date — `buildDays()[dayIndex].date.getDay()`).
 * Windows are matched on their open day; past-midnight windows extend beyond
 * 1440 so an early event still matches the prior day's late window is handled
 * by the caller passing both days — here we only test same-open-day windows.
 */
export function openingStatusFor(
  item: Pick<ScheduleItem, 'startMinute' | 'durationMinutes' | 'place'>,
  weekday: number,
): OpeningStatus {
  const periods = item.place.openingPeriods;
  if (!periods || periods.length === 0) return 'unknown';

  const start = item.startMinute;
  const end = item.startMinute + item.durationMinutes;

  // Candidate windows in *this day's* minute space:
  //  - windows opening today (as stored), plus
  //  - yesterday's windows that cross midnight (close > 24:00), shifted back a
  //    day so e.g. Fri 18:00–26:00 covers Sat 00:00–02:00.
  const yesterday = (weekday + 6) % 7;
  const windows = periods
    .filter((p) => p.day === weekday)
    .map((p) => ({ open: hhmmToMinutes(p.open), close: hhmmToMinutes(p.close) }))
    .concat(
      periods
        .filter((p) => p.day === yesterday && hhmmToMinutes(p.close) > 24 * 60)
        .map((p) => ({ open: 0, close: hhmmToMinutes(p.close) - 24 * 60 })),
    );

  if (windows.length === 0) return 'closed';

  let overlaps = false;
  for (const w of windows) {
    if (start >= w.open && end <= w.close) return 'open';
    if (start < w.close && end > w.open) overlaps = true;
  }
  return overlaps ? 'partial' : 'closed';
}
