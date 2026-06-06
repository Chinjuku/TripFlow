import { Elysia, t } from 'elysia';
import {
  handleCreateSettlement,
  handleConfirmSettlement,
  handleDeleteSettlement,
} from '../controllers/settlements';
import { requireAuth } from '../middleware/auth';

export const settlementsRoute = new Elysia()
  .use(requireAuth)
  .post('/settlement', handleCreateSettlement, {
    body: t.Object({
      tripId: t.String({ format: 'uuid' }),
      payeeId: t.String({ format: 'uuid' }),
      payerId: t.Optional(t.String({ format: 'uuid' })),
      amount: t.Numeric({ minimum: 0.01 }),
      isCentralFund: t.Optional(t.Boolean()),
    }),
  })
  .post('/settlement/:id/confirm', handleConfirmSettlement, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  })
  .delete('/settlement/:id', handleDeleteSettlement, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
  });
