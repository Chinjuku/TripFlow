import {
  db,
  expenses,
  expenseSplits,
  trips,
  type Expense,
} from '@trip-flow/db/server';
import { eq } from 'drizzle-orm';
import { loadTripMembers, type TripMemberProfile } from './trips';
import { ensureTripMember } from './finances';
import type { HydratedExpense } from '../models/finances';

export interface CreateExpenseInput {
  tripId: string;
  description: string;
  amount: number;
  paidById: string;
  category: 'food' | 'transport' | 'activity' | 'lodging' | 'other';
  splitMethod: 'equally' | 'exact_amount';
  expenseDate?: string;
  isCentralFund?: boolean;
  splits: {
    userId: string;
    amount: number;
    itemPaid?: string | null;
  }[];
}

/**
 * Creates an expense and splits inside a transaction.
 */
export async function createExpense(
  userId: string,
  input: CreateExpenseInput,
): Promise<HydratedExpense> {
  await ensureTripMember(userId, input.tripId);

  if (input.splits.length === 0) {
    throw new Error('Expense must be split with at least one member');
  }

  // Verify split amount sum equals total amount
  const splitSum = input.splits.reduce((sum, s) => sum + s.amount, 0);
  if (Math.abs(splitSum - input.amount) > 0.05) {
    throw new Error(`Split sum (${splitSum}) must equal total amount (${input.amount})`);
  }

  const hydrated = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(expenses)
      .values({
        trip_id: input.tripId,
        description: input.description,
        amount: input.amount,
        paid_by_id: input.paidById,
        category: input.category,
        split_method: input.splitMethod,
        is_central_fund: input.isCentralFund ?? false,
        expense_date: input.expenseDate
          ? new Date(input.expenseDate).toISOString()
          : new Date().toISOString(),
      })
      .returning();

    if (!created) throw new Error('Failed to create expense');

    const splitValues = input.splits.map((s) => ({
      expense_id: created.id,
      user_id: s.userId,
      amount: s.amount,
      item_paid: s.itemPaid || null,
    }));

    await tx.insert(expenseSplits).values(splitValues);

    return created;
  });

  // Re-fetch hydrated expense detail
  const members = await loadTripMembers(input.tripId);
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const payer = memberMap.get(hydrated.paid_by_id);

  const splits = await db
    .select()
    .from(expenseSplits)
    .where(eq(expenseSplits.expense_id, hydrated.id));
  const hydratedSplits = splits.map((s) => {
    const splitUser = memberMap.get(s.user_id);
    return {
      ...s,
      userName: splitUser?.name ?? 'Traveller',
      avatarUrl: splitUser?.avatarUrl ?? null,
    };
  });

  return {
    ...hydrated,
    payerName: payer?.name ?? 'Traveller',
    payerAvatarUrl: payer?.avatarUrl ?? null,
    splits: hydratedSplits,
  };
}
