/**
 * Schedule controller — HTTP request/response adapter.
 *
 * Extracts HTTP concerns and delegates business logic to the schedule service.
 */

import * as scheduleService from '../services/schedule';

type AuthContext = { user: { sub: string } };

export async function handleListSchedule({
  user,
  params,
}: AuthContext & { params: { id: string } }) {
  const items = await scheduleService.listSchedule(user.sub, params.id);
  return { items };
}

export async function handleAddScheduleItem({
  user,
  params,
  body,
}: AuthContext & { params: { id: string }; body: any }) {
  const item = await scheduleService.addScheduleItem(user.sub, params.id, body);
  return { item };
}

export async function handleUpdateScheduleItem({
  user,
  params,
  body,
}: AuthContext & { params: { id: string; scheduleId: string }; body: any }) {
  const item = await scheduleService.updateScheduleItem(
    user.sub,
    params.id,
    params.scheduleId,
    body,
  );
  return { item };
}

export async function handleRemoveScheduleItem({
  user,
  params,
}: AuthContext & { params: { id: string; scheduleId: string } }) {
  await scheduleService.removeScheduleItem(user.sub, params.id, params.scheduleId);
  return { ok: true };
}
