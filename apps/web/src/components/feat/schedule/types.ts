export interface SchedulePlace {
  id: string;
  /** Google place_id (or "mock_…" for legacy rows). */
  externalId: string;
  name: string;
  address: string | null;
  category: string | null;
  lat: number | null;
  lng: number | null;
  photoUrl: string | null;
  rating: number | null;
  openingHoursText: string | null;
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
