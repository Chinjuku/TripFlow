/**
 * Places routes — picking + voting on candidate places for a trip.
 *
 *   GET    /trips/:id/places          List candidate places with vote counts + liked flag
 *   POST   /trips/:id/places          Add a place (idempotent on external_id)
 *   DELETE /trips/:id/places/:placeId Remove a candidate (adder only)
 *   PUT    /trips/:id/places/:placeId/like
 *                                     Toggle the caller's like (body: { liked: boolean })
 *
 * Place discovery happens on the client against Google Places — the API
 * only persists the chosen snapshots.
 */

import { Elysia, t } from 'elysia';
import { requireAuth } from '../middleware/auth';
import {
  handleListPlaces,
  handleAddPlace,
  handleRemovePlace,
  handleSetLike,
} from '../controllers/places';

export const placesRoute = new Elysia()
  .use(requireAuth)
  .get('/trips/:id/places', handleListPlaces, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
  })
  .post('/trips/:id/places', handleAddPlace, {
    params: t.Object({ id: t.String({ format: 'uuid' }) }),
    body: t.Object({
      externalId: t.String({ minLength: 1, maxLength: 200 }),
      name: t.String({ minLength: 1, maxLength: 200 }),
      address: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
      nameEn: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
      addressEn: t.Optional(t.Nullable(t.String({ maxLength: 500 }))),
      category: t.Optional(t.Nullable(t.String({ maxLength: 64 }))),
      lat: t.Optional(t.Nullable(t.Number())),
      lng: t.Optional(t.Nullable(t.Number())),
      photoUrl: t.Optional(t.Nullable(t.String({ maxLength: 1000 }))),
      rating: t.Optional(t.Nullable(t.Number({ minimum: 0, maximum: 5 }))),
      openingHoursText: t.Optional(t.Nullable(t.String({ maxLength: 200 }))),
      stayMinutes: t.Optional(t.Nullable(t.Integer({ minimum: 5, maximum: 1440 }))),
    }),
  })
  .delete('/trips/:id/places/:placeId', handleRemovePlace, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
      placeId: t.String({ format: 'uuid' }),
    }),
  })
  .put('/trips/:id/places/:placeId/like', handleSetLike, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
      placeId: t.String({ format: 'uuid' }),
    }),
    body: t.Object({ liked: t.Boolean() }),
  });
