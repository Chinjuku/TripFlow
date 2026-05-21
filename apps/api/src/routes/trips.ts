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
import * as tripsService from '../services/trips';

export const tripsRoute = new Elysia({ prefix: '/trips' })
  .use(requireAuth)
  .get('/', async ({ user }) => {
    const trips = await tripsService.listTripsForUser(user.sub);
    return { trips };
  })
  .post(
    '/',
    async ({ user, body }) => {
      const trip = await tripsService.createTrip(user.sub, body);
      return { trip };
    },
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
    async ({ user, body }) => {
      const trip = await tripsService.joinTripByCode(user.sub, body.inviteCode);
      return { trip };
    },
    {
      body: t.Object({
        inviteCode: t.String({ minLength: 4, maxLength: 32 }),
      }),
    },
  )
  .get(
    '/:id',
    async ({ user, params }) => {
      const trip = await tripsService.getTripDetail(user.sub, params.id);
      return { trip };
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  );
