/**
 * Trips routes — protected by requireAuth.
 *
 *   GET  /trips         List trips the caller is a member of
 *   POST /trips         Create a new trip (caller becomes owner)
 *   POST /trips/join    Join an existing trip by invite code
 *
 * Handlers are kept inline so Elysia can flow the `requireAuth` derive
 * type (`user`) into each handler. They contain zero business logic —
 * everything delegates to the trips service.
 */

import { Elysia, t } from 'elysia';
import { requireAuth } from '../middleware/auth';
import {
  handleListTripsForUser,
  handleCreateTrip,
  handleJoinTripByCode,
  handleGetTripDetail,
} from '../controllers/trips';

export const tripsRoute = new Elysia({ prefix: '/trips' })
  .use(requireAuth)
  .get('/', handleListTripsForUser)
  .post(
    '/',
    handleCreateTrip,
    {
      body: t.Object({
        title: t.String({ minLength: 1, maxLength: 120 }),
        startsOn: t.String({ format: 'date-time' }),
        endsOn: t.String({ format: 'date-time' }),
      }),
    },
  )
  .post(
    '/join',
    handleJoinTripByCode,
    {
      body: t.Object({
        inviteCode: t.String({ minLength: 4, maxLength: 32 }),
      }),
    },
  )
  .get(
    '/:id',
    handleGetTripDetail,
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  );
