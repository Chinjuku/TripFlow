import { api } from '@/lib/api';
import { unwrap } from '@/lib/unwrap';
import type { AddSchedulePayload, ScheduleItem, UpdateSchedulePayload } from '@/types/schedule';

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
