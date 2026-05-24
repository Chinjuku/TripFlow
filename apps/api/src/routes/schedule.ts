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
import {
  handleListSchedule,
  handleAddScheduleItem,
  handleUpdateScheduleItem,
  handleRemoveScheduleItem,
} from '../controllers/schedule';

const MAX_MINUTES_PER_DAY = 24 * 60;

export const scheduleRoute = new Elysia()
  .use(requireAuth)
  .get('/trips/:id/schedule', handleListSchedule, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
  })
  .post('/trips/:id/schedule', handleAddScheduleItem, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      tripPlaceId: t.String({ format: 'uuid' }),
      dayIndex: t.Integer({ minimum: 0, maximum: 60 }),
      startMinute: t.Integer({ minimum: 0, maximum: MAX_MINUTES_PER_DAY - 1 }),
      durationMinutes: t.Optional(t.Integer({ minimum: 5, maximum: MAX_MINUTES_PER_DAY })),
      notes: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
    }),
  })
  .patch('/trips/:id/schedule/:scheduleId', handleUpdateScheduleItem, {
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
  })
  .delete('/trips/:id/schedule/:scheduleId', handleRemoveScheduleItem, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
      scheduleId: t.String({ format: 'uuid' }),
    }),
  });
