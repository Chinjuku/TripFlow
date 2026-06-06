import { Elysia, t } from 'elysia';
import { handleUpdateCentralFund } from '../controllers/central-funds';
import { requireAuth } from '../middleware/auth';

export const centralFundsRoute = new Elysia()
  .use(requireAuth)
  .patch('/trip/:tripId/central-fund', handleUpdateCentralFund, {
    params: t.Object({
      tripId: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      treasurerId: t.Optional(t.Nullable(t.String({ format: 'uuid' }))),
      centralFundPerPerson: t.Optional(t.Nullable(t.Numeric({ minimum: 0.0 }))),
    }),
  });
