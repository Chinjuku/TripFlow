/**
 * Finances routes — finances for a trip.
 *
 *   GET    /finances/trip/:tripId          Get trip finances (balances, expenses, settlements)
 *   POST   /finances/expense               Create a new expense with custom split allocations
 *   POST   /finances/settlement            Record a settlement payment between members
 *   POST   /finances/settlement/:id/confirm
 *                                          Confirm receipt of a pending settlement
 *   POST   /finances/budget                Update the overall trip budget
 *   POST   /finances/payment-details       Save current user's banking/PromptPay details
 *   GET    /finances/payment-details       Retrieve current user's payment details
 *
 * All routes are scoped under /finances and require authentication.
 */

import { Elysia, t } from 'elysia';
import { requireAuth } from '../middleware/auth';
import {
  handleGetFinancesByTripId,
  handleCreateExpense,
  handleCreateSettlement,
  handleConfirmSettlement,
  handleUpdateTripBudget,
  handleUpdateTripOptimization,
  handleUpdateCentralFund,
  handleSaveUserPaymentDetails,
  handleGetUserPaymentDetails,
  handleVerifySlip,
  handleExtractReceipt,
} from '../controllers/finances';

export const financesRoute = new Elysia({ prefix: '/finances' })
  .use(requireAuth)
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
  .patch('/trip/:tripId/central-fund', handleUpdateCentralFund, {
    params: t.Object({
      tripId: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      treasurerId: t.Optional(t.Nullable(t.String({ format: 'uuid' }))),
      centralFundPerPerson: t.Optional(t.Nullable(t.Numeric({ minimum: 0.0 }))),
    }),
  })
  .post('/expense', handleCreateExpense, {
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
      splitMethod: t.Union([t.Literal('equally'), t.Literal('exact_amount')]),
      expenseDate: t.Optional(t.String()),
      isCentralFund: t.Optional(t.Boolean()),
      splits: t.Array(
        t.Object({
          userId: t.String({ format: 'uuid' }),
          amount: t.Numeric({ minimum: 0.0 }),
          itemPaid: t.Optional(t.Nullable(t.String({ maxLength: 100 }))),
        }),
      ),
    }),
  })
  .post('/settlement', handleCreateSettlement, {
    body: t.Object({
      tripId: t.String({ format: 'uuid' }),
      payeeId: t.String({ format: 'uuid' }),
      amount: t.Numeric({ minimum: 0.01 }),
      isCentralFund: t.Optional(t.Boolean()),
    }),
  })
  .post('/settlement/:id/confirm', handleConfirmSettlement, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
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
  .get('/payment-details', handleGetUserPaymentDetails)
  .post('/settlement/:id/verify-slip', handleVerifySlip, {
    params: t.Object({
      id: t.String({ format: 'uuid' }),
    }),
    body: t.Object({
      slip_image: t.File(),
    }),
  })
  .post('/extract-receipt', handleExtractReceipt, {
    body: t.Object({
      slip_image: t.File(),
    }),
  });
