/**
 * Schedule routes — places promoted onto the day-by-day itinerary.
 *
 *   GET    /trips/:id/schedule              List every scheduled item
 *   POST   /trips/:id/schedule              Place an existing trip_place onto a day/time
 *   PATCH  /trips/:id/schedule/:scheduleId  Move time / day / duration / notes
 *   DELETE /trips/:id/schedule/:scheduleId  Remove from the itinerary
 */

import { Elysia, t } from 'elysia';
import { requireAuth } from '../middleware/auth';
import * as scheduleService from '../services/schedule';

const MAX_MINUTES_PER_DAY = 24 * 60;

export const scheduleRoute = new Elysia()
  .use(requireAuth)
  .get(
    '/trips/:id/schedule',
    async ({ user, params }) => {
      const items = await scheduleService.listSchedule(user.sub, params.id);
      return { items };
    },
    { params: t.Object({ id: t.String({ format: 'uuid' }) }) },
  )
  .post(
    '/trips/:id/schedule',
    async ({ user, params, body }) => {
      const item = await scheduleService.addScheduleItem(user.sub, params.id, body);
      return { item };
    },
    {
      params: t.Object({ id: t.String({ format: 'uuid' }) }),
      body: t.Object({
        tripPlaceId: t.String({ format: 'uuid' }),
        dayIndex: t.Integer({ minimum: 0, maximum: 60 }),
        startMinute: t.Integer({ minimum: 0, maximum: MAX_MINUTES_PER_DAY - 1 }),
        durationMinutes: t.Optional(t.Integer({ minimum: 5, maximum: MAX_MINUTES_PER_DAY })),
        notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
      }),
    },
  )
  .patch(
    '/trips/:id/schedule/:scheduleId',
    async ({ user, params, body }) => {
      const item = await scheduleService.updateScheduleItem(
        user.sub,
        params.id,
        params.scheduleId,
        body,
      );
      return { item };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        scheduleId: t.String({ format: 'uuid' }),
      }),
      body: t.Object({
        dayIndex: t.Optional(t.Integer({ minimum: 0, maximum: 60 })),
        startMinute: t.Optional(t.Integer({ minimum: 0, maximum: MAX_MINUTES_PER_DAY - 1 })),
        durationMinutes: t.Optional(t.Integer({ minimum: 5, maximum: MAX_MINUTES_PER_DAY })),
        notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
      }),
    },
  )
  .delete(
    '/trips/:id/schedule/:scheduleId',
    async ({ user, params }) => {
      await scheduleService.removeScheduleItem(user.sub, params.id, params.scheduleId);
      return { ok: true };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
        scheduleId: t.String({ format: 'uuid' }),
      }),
    },
  );
