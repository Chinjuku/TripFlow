import { Elysia, t } from 'elysia';
import { handleCreateExpense } from '../controllers/expenses';
import { requireAuth } from '../middleware/auth';

export const expensesRoute = new Elysia()
  .use(requireAuth)
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
  });
