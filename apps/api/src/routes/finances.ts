import { Elysia, t } from 'elysia';
import { requireAuth } from '../middleware/auth';
import * as financesService from '../services/finances';

export const financesRoute = new Elysia({ prefix: '/finances' })
  .use(requireAuth)
  .get(
    '/trip/:tripId',
    async ({ user, params, query }) => {
      const isDebtOptimized = query.optimized === 'true';
      return await financesService.getFinancesByTripId(user.sub, params.tripId, isDebtOptimized);
    },
    {
      params: t.Object({
        tripId: t.String({ format: 'uuid' }),
      }),
      query: t.Object({
        optimized: t.Optional(t.String()),
      }),
    },
  )
  .post(
    '/expense',
    async ({ user, body }) => {
      return await financesService.createExpense(user.sub, body);
    },
    {
      body: t.Object({
        tripId: t.String({ format: 'uuid' }),
        description: t.String({ minLength: 1, maxLength: 200 }),
        amount: t.Numeric({ minimum: 0.01 }),
        paidById: t.String({ format: 'uuid' }),
        category: t.Union([
          t.Literal('food'),
          t.Literal('transport'),
          t.Literal('activity'),
          t.Literal('lodging'),
          t.Literal('other'),
        ]),
        splitMethod: t.Union([
          t.Literal('equally'),
          t.Literal('exact_amount'),
        ]),
        expenseDate: t.Optional(t.String()),
        splits: t.Array(
          t.Object({
            userId: t.String({ format: 'uuid' }),
            amount: t.Numeric({ minimum: 0.0 }),
            itemPaid: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
          }),
        ),
      }),
    },
  )
  .post(
    '/settlement',
    async ({ user, body }) => {
      return await financesService.createSettlement(user.sub, body);
    },
    {
      body: t.Object({
        tripId: t.String({ format: 'uuid' }),
        payeeId: t.String({ format: 'uuid' }),
        amount: t.Numeric({ minimum: 0.01 }),
      }),
    },
  )
  .post(
    '/settlement/:id/confirm',
    async ({ user, params }) => {
      return await financesService.confirmSettlement(user.sub, params.id);
    },
    {
      params: t.Object({
        id: t.String({ format: 'uuid' }),
      }),
    },
  )
  .post(
    '/budget',
    async ({ user, body }) => {
      return await financesService.updateTripBudget(user.sub, body);
    },
    {
      body: t.Object({
        tripId: t.String({ format: 'uuid' }),
        amount: t.Numeric({ minimum: 0.0 }),
      }),
    },
  )
  .post(
    '/payment-details',
    async ({ user, body }) => {
      return await financesService.saveUserPaymentDetails(user.sub, body);
    },
    {
      body: t.Object({
        promptpayId: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
        qrCodeUrl: t.Optional(t.Nullable(t.String())),
        bankName: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
        bankAccountNumber: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
        bankAccountName: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
        isShowMobileBanking: t.Optional(t.Boolean()),
        isShowPromptpay: t.Optional(t.Boolean()),
      }),
    },
  )
  .get(
    '/payment-details',
    async ({ user }) => {
      return await financesService.getUserPaymentDetails(user.sub);
    }
  );

