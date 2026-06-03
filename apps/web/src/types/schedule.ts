import type { OpeningPeriod } from '@/utils/places-map';

export interface SchedulePlace {
  id: string;
  /** Google place_id (or "mock_…" for legacy rows). */
  externalId: string;
  name: string;
  address: string | null;
  nameEn: string | null;
  addressEn: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  rating: number | null;
  openingHoursText: string | null;
  /** Machine-readable weekly hours for the open/closed check; null = unknown. */
  openingPeriods: OpeningPeriod[] | null;
}

export interface ScheduleItem {
  id: string;
  tripPlaceId: string;
  dayIndex: number;
  startMinute: number;
  durationMinutes: number;
  notes: string | null;
  createdAt: string;
  place: SchedulePlace;
}

export interface AddSchedulePayload {
  tripPlaceId: string;
  dayIndex: number;
  startMinute: number;
  durationMinutes?: number;
  notes?: string | null;
}

export interface UpdateSchedulePayload {
  dayIndex?: number;
  startMinute?: number;
  durationMinutes?: number;
  notes?: string | null;
}

export interface DayInfo {
  index: number;
  date: Date;
  label: string;
  subLabel: string;
}

export type DragPayload =
  | { kind: 'new'; tripPlaceId: string }
  | { kind: 'existing'; scheduleId: string };
