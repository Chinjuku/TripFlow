import { api } from '@/lib/api';
import type { AddSchedulePayload, ScheduleItem, UpdateSchedulePayload } from '@/types/schedule';

function unwrap<T>(value: { data: T | null; error: unknown }): T {
  if (value.error) {
    const message =
      typeof value.error === 'object' && value.error !== null && 'message' in value.error
        ? String((value.error as { message: unknown }).message)
        : 'Request failed';
    throw new Error(message);
  }
  if (value.data === null) {
    throw new Error('Empty response');
  }
  return value.data;
}

export async function listSchedule(tripId: string): Promise<ScheduleItem[]> {
  const res = await api.trips[tripId]!.schedule.get();
  const { items } = unwrap(res) as { items: ScheduleItem[] };
  return items;
}

export async function addSchedule(
  tripId: string,
  payload: AddSchedulePayload,
): Promise<ScheduleItem> {
  const res = await api.trips[tripId]!.schedule.post(payload);
  const { item } = unwrap(res) as { item: ScheduleItem };
  return item;
}

export async function updateSchedule(
  tripId: string,
  scheduleId: string,
  patch: UpdateSchedulePayload,
): Promise<ScheduleItem> {
  const res = await api.trips[tripId]!.schedule[scheduleId]!.patch(patch);
  const { item } = unwrap(res) as { item: ScheduleItem };
  return item;
}

export async function removeSchedule(tripId: string, scheduleId: string): Promise<void> {
  const res = await api.trips[tripId]!.schedule[scheduleId]!.delete();
  unwrap(res);
}
