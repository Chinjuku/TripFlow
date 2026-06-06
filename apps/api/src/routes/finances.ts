/**
 * Finances routes — finances for a trip.
 *
 *   GET    /finances/trip/:tripId          Get trip finances (balances, expenses, settlements)
 *   POST   /finances/budget                Update the overall trip budget
 *   POST   /finances/payment-details       Save current user's banking/PromptPay details
 *   GET    /finances/payment-details       Retrieve current user's payment details
 *
 * And mounts sub-routes for features:
 * - /finances/expense
 * - /finances/settlement
 * - /finances/extract-receipt
 * - /finances/trip/:tripId/central-fund
 *
 * All routes are scoped under /finances and require authentication.
 */

import { Elysia, t } from 'elysia';
import { requireAuth } from '../middleware/auth';
import {
  handleGetFinancesByTripId,
  handleUpdateTripBudget,
  handleUpdateTripOptimization,
  handleSaveUserPaymentDetails,
  handleGetUserPaymentDetails,
} from '../controllers/finances';

import { expensesRoute } from './expenses';
import { settlementsRoute } from './settlements';
import { slipOcrRoute } from './slip-ocr';
import { centralFundsRoute } from './central-funds';

export const financesRoute = new Elysia({ prefix: '/finances' })
  .use(requireAuth)
  .use(expensesRoute)
  .use(settlementsRoute)
  .use(slipOcrRoute)
  .use(centralFundsRoute)
  .get('/trip/:tripId', handleGetFinancesByTripId, {
    params: t.Object({
      tripId: t.String({ format: 'uuid' }),
    }),
    query: t.Object({
      optimized: t.Optional(t.String()),
    }),
  })
  .post('/trip/:tripId/optimize', handleUpdateTripOptimization, {
    params: t.Object({
      tripId: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      isOptimized: t.Boolean(),
    }),
  })
  .post('/budget', handleUpdateTripBudget, {
    body: t.Object({
      tripId: t.String({ format: 'uuid' }),
      amount: t.Numeric({ minimum: 0.0 }),
    }),
  })
  .post('/payment-details', handleSaveUserPaymentDetails, {
    body: t.Object({
      promptpayId: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
      qrCodeUrl: t.Optional(t.Nullable(t.String())),
      bankName: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
      bankAccountNumber: t.Optional(t.Nullable(t.String({ maxLength: 50 }))),
      bankAccountName: t.Optional(t.Nullable(t.String({ maxLength: 150 }))),
      isShowMobileBanking: t.Optional(t.Boolean()),
      isShowPromptpay: t.Optional(t.Boolean()),
    }),
  })
  .get('/payment-details', handleGetUserPaymentDetails);
