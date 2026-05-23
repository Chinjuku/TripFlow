import {
  db,
  expenses,
  expenseSplits,
  settlements,
  tripBudgets,
  userPaymentDetails,
  tripMembers,
  type Expense,
  type ExpenseSplit,
  type Settlement,
  type TripBudget,
  type UserPaymentDetail,
} from '@trip-flow/db/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { NotFoundError, ForbiddenError } from '../errors/domain';
import { getUserById } from './auth';
import { loadTripMembers, type TripMemberProfile } from './trips';

export interface FinanceSummary {
  totalGroupCost: number;
  userShare: number;
  totalOwedToUser: number; // Sum of what others owe the user
  totalUserOwes: number; // Sum of what the user owes others
  whoOwesYou: DebtRelation[];
  whatYouOwe: DebtRelation[];
  balances: Record<string, number>; // Net balance per user id
  budget: TripBudget | null;
  paymentDetails: Record<string, UserPaymentDetail>;
}

export interface DebtRelation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  amount: number;
}

export interface HydratedExpenseSplit extends ExpenseSplit {
  userName: string;
  avatarUrl: string | null;
}

export interface HydratedExpense extends Expense {
  payerName: string;
  payerAvatarUrl: string | null;
  splits: HydratedExpenseSplit[];
}

export interface HydratedSettlement extends Settlement {
  payerName: string;
  payerAvatarUrl: string | null;
  payeeName: string;
  payeeAvatarUrl: string | null;
}

export interface FinancesData {
  summary: FinanceSummary;
  expenses: HydratedExpense[];
  settlements: HydratedSettlement[];
}

/**
 * Assures user is a member of the trip, otherwise throws NotFoundError.
 */
async function ensureTripMember(userId: string, tripId: string) {
  const [membership] = await db
    .select()
    .from(tripMembers)
    .where(and(eq(tripMembers.trip_id, tripId), eq(tripMembers.user_id, userId)))
    .limit(1);

  if (!membership) {
    throw new NotFoundError('Trip not found or access denied');
  }
}

/**
 * Resolves trip finance summary and history (expenses, settlements, budgets).
 */
export async function getFinancesByTripId(
  userId: string,
  tripId: string,
  isDebtOptimized: boolean = false,
): Promise<FinancesData> {
  await ensureTripMember(userId, tripId);

  // 1. Load Trip Members
  const members = await loadTripMembers(tripId);
  const memberMap = new Map<string, TripMemberProfile>();
  const memberUserIds: string[] = [];
  for (const m of members) {
    memberMap.set(m.userId, m);
    memberUserIds.push(m.userId);
  }

  // 2. Load Expenses & Splits
  const rawExpenses = await db
    .select()
    .from(expenses)
    .where(eq(expenses.trip_id, tripId))
    .orderBy(desc(expenses.expense_date), desc(expenses.created_at));

  const expenseIds = rawExpenses.map((e) => e.id);
  const rawSplits =
    expenseIds.length > 0
      ? await db.select().from(expenseSplits).where(inArray(expenseSplits.expense_id, expenseIds))
      : [];

  const splitsByExpense = new Map<string, ExpenseSplit[]>();
  for (const s of rawSplits) {
    const list = splitsByExpense.get(s.expense_id) ?? [];
    list.push(s);
    splitsByExpense.set(s.expense_id, list);
  }

  // Hydrate expenses
  const hydratedExpenses: HydratedExpense[] = rawExpenses.map((exp) => {
    const payer = memberMap.get(exp.paid_by_id);
    const expSplits = splitsByExpense.get(exp.id) ?? [];

    const hydratedSplits: HydratedExpenseSplit[] = expSplits.map((split) => {
      const splitUser = memberMap.get(split.user_id);
      return {
        ...split,
        userName: splitUser?.name ?? 'Traveller',
        avatarUrl: splitUser?.avatarUrl ?? null,
      };
    });

    return {
      ...exp,
      payerName: payer?.name ?? 'Traveller',
      payerAvatarUrl: payer?.avatarUrl ?? null,
      splits: hydratedSplits,
    };
  });

  // 3. Load Settlements
  const rawSettlements = await db
    .select()
    .from(settlements)
    .where(eq(settlements.trip_id, tripId))
    .orderBy(desc(settlements.created_at));

  const hydratedSettlements: HydratedSettlement[] = rawSettlements.map((set) => {
    const payer = memberMap.get(set.payer_id);
    const payee = memberMap.get(set.payee_id);
    return {
      ...set,
      payerName: payer?.name ?? 'Traveller',
      payerAvatarUrl: payer?.avatarUrl ?? null,
      payeeName: payee?.name ?? 'Traveller',
      payeeAvatarUrl: payee?.avatarUrl ?? null,
    };
  });

  // 4. Load budget (global budget is category is null)
  const [budget] = await db
    .select()
    .from(tripBudgets)
    .where(and(eq(tripBudgets.trip_id, tripId), sql`${tripBudgets.category} is null`))
    .limit(1);

  // 5. Load Payment Details for members
  const paymentRows =
    memberUserIds.length > 0
      ? await db
          .select()
          .from(userPaymentDetails)
          .where(inArray(userPaymentDetails.user_id, memberUserIds))
      : [];

  const paymentDetailsRecord: Record<string, UserPaymentDetail> = {};
  for (const row of paymentRows) {
    paymentDetailsRecord[row.user_id] = row;
  }

  // ==========================================
  // Calculations
  // ==========================================

  // A. Total Group Cost
  let totalGroupCost = 0;
  for (const exp of rawExpenses) {
    totalGroupCost += exp.amount;
  }

  // B. Net Balances Calculation (based on expenses, splits, and completed settlements)
  const netBalances: Record<string, number> = {};
  for (const m of members) {
    netBalances[m.userId] = 0;
  }

  // Plus amount paid in expenses
  for (const exp of rawExpenses) {
    const payerId = exp.paid_by_id;
    if (netBalances[payerId] !== undefined) {
      netBalances[payerId] += exp.amount;
    }
  }

  // Minus split amounts owed
  for (const split of rawSplits) {
    const userId = split.user_id;
    if (netBalances[userId] !== undefined) {
      netBalances[userId] -= split.amount;
    }
  }

  // Apply COMPLETED settlements
  for (const set of rawSettlements) {
    if (set.status === 'completed') {
      const payerBal = netBalances[set.payer_id];
      if (payerBal !== undefined) {
        netBalances[set.payer_id] = payerBal + set.amount; // Reduced debt
      }
      const payeeBal = netBalances[set.payee_id];
      if (payeeBal !== undefined) {
        netBalances[set.payee_id] = payeeBal - set.amount; // Received repayment
      }
    }
  }

  // C. Calculate Debts: direct vs optimized
  let whoOwesYou: DebtRelation[] = [];
  let whatYouOwe: DebtRelation[] = [];

  if (isDebtOptimized) {
    // Greedy transaction minimization
    const balances = Object.entries(netBalances).map(([userId, amount]) => ({
      userId,
      amount,
    }));

    // Keep loop safe from floating point infinite loops using an epsilon
    let iterations = 0;
    const maxIterations = balances.length * balances.length;

    // We will compute all optimized transfers
    const transfers: { debtorId: string; creditorId: string; amount: number }[] = [];

    while (iterations < maxIterations) {
      balances.sort((a, b) => a.amount - b.amount); // Ascending (debtors first, then creditors)

      const debtor = balances[0];
      const creditor = balances[balances.length - 1];

      if (!debtor || !creditor) break;
      if (debtor.amount >= -0.01 || creditor.amount <= 0.01) break;

      const amountToTransfer = Math.min(-debtor.amount, creditor.amount);
      transfers.push({
        debtorId: debtor.userId,
        creditorId: creditor.userId,
        amount: Number(amountToTransfer.toFixed(2)),
      });

      debtor.amount += amountToTransfer;
      creditor.amount -= amountToTransfer;
      iterations++;
    }

    // Filter transfers involving active user
    for (const t of transfers) {
      if (t.debtorId === userId) {
        const creditorUser = memberMap.get(t.creditorId);
        whatYouOwe.push({
          userId: t.creditorId,
          name: creditorUser?.name ?? 'Traveller',
          avatarUrl: creditorUser?.avatarUrl ?? null,
          amount: t.amount,
        });
      } else if (t.creditorId === userId) {
        const debtorUser = memberMap.get(t.debtorId);
        whoOwesYou.push({
          userId: t.debtorId,
          name: debtorUser?.name ?? 'Traveller',
          avatarUrl: debtorUser?.avatarUrl ?? null,
          amount: t.amount,
        });
      }
    }
  } else {
    // Direct pairwise balance
    const pairwiseDebt: Record<string, Record<string, number>> = {};
    for (const m1 of members) {
      const userDebt: Record<string, number> = {};
      pairwiseDebt[m1.userId] = userDebt;
      for (const m2 of members) {
        userDebt[m2.userId] = 0;
      }
    }

    // Accumulate splits
    for (const exp of rawExpenses) {
      const payerId = exp.paid_by_id;
      const expSplits = splitsByExpense.get(exp.id) ?? [];
      for (const split of expSplits) {
        if (split.user_id !== payerId) {
          // split.user_id owes payerId
          const debtorDebts = pairwiseDebt[split.user_id];
          if (debtorDebts) {
            debtorDebts[payerId] = (debtorDebts[payerId] ?? 0) + split.amount;
          }
        }
      }
    }

    // Subtract completed settlements
    for (const set of rawSettlements) {
      if (set.status === 'completed') {
        // set.payer_id paid set.payee_id, reducing what payer_id owes payee_id
        const debtorDebts = pairwiseDebt[set.payer_id];
        if (debtorDebts) {
          debtorDebts[set.payee_id] = (debtorDebts[set.payee_id] ?? 0) - set.amount;
        }
      }
    }

    // Net the pairwise values: if A owes B 100, and B owes A 40, then A owes B 60.
    for (let i = 0; i < members.length; i++) {
      const m1 = members[i];
      if (!m1) continue;
      for (let j = i + 1; j < members.length; j++) {
        const m2 = members[j];
        if (!m2) continue;
        const u1 = m1.userId;
        const u2 = m2.userId;

        const d1 = pairwiseDebt[u1];
        const d2 = pairwiseDebt[u2];
        if (!d1 || !d2) continue;

        const u1OwesU2 = d1[u2] ?? 0;
        const u2OwesU1 = d2[u1] ?? 0;

        if (u1OwesU2 > u2OwesU1) {
          d1[u2] = u1OwesU2 - u2OwesU1;
          d2[u1] = 0;
        } else {
          d2[u1] = u2OwesU1 - u1OwesU2;
          d1[u2] = 0;
        }
      }
    }

    // Build lists for active user
    // "Who owes you" - active user is payee (creditor)
    for (const m of members) {
      if (m.userId !== userId) {
        const debtorDebts = pairwiseDebt[m.userId];
        const amountOwed = debtorDebts ? (debtorDebts[userId] ?? 0) : 0;
        if (amountOwed > 0.01) {
          whoOwesYou.push({
            userId: m.userId,
            name: m.name,
            avatarUrl: m.avatarUrl,
            amount: Number(amountOwed.toFixed(2)),
          });
        }
      }
    }

    // "What you owe" - active user is payer (debtor)
    const userDebts = pairwiseDebt[userId];
    for (const m of members) {
      if (m.userId !== userId) {
        const amountOwed = userDebts ? (userDebts[m.userId] ?? 0) : 0;
        if (amountOwed > 0.01) {
          whatYouOwe.push({
            userId: m.userId,
            name: m.name,
            avatarUrl: m.avatarUrl,
            amount: Number(amountOwed.toFixed(2)),
          });
        }
      }
    }
  }

  // Calculate active user's total shares (what they spent in splits)
  let userShare = 0;
  for (const split of rawSplits) {
    if (split.user_id === userId) {
      userShare += split.amount;
    }
  }

  const totalOwedToUser = whoOwesYou.reduce((sum, d) => sum + d.amount, 0);
  const totalUserOwes = whatYouOwe.reduce((sum, d) => sum + d.amount, 0);

  return {
    summary: {
      totalGroupCost: Number(totalGroupCost.toFixed(2)),
      userShare: Number(userShare.toFixed(2)),
      totalOwedToUser: Number(totalOwedToUser.toFixed(2)),
      totalUserOwes: Number(totalUserOwes.toFixed(2)),
      whoOwesYou,
      whatYouOwe,
      balances: netBalances,
      budget: budget ?? null,
      paymentDetails: paymentDetailsRecord,
    },
    expenses: hydratedExpenses,
    settlements: hydratedSettlements,
  };
}

export interface CreateExpenseInput {
  tripId: string;
  description: string;
  amount: number;
  paidById: string;
  category: 'food' | 'transport' | 'activity' | 'lodging' | 'other';
  splitMethod: 'equally' | 'exact_amount';
  expenseDate?: string;
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

export interface CreateSettlementInput {
  tripId: string;
  payeeId: string;
  amount: number;
}

/**
 * Creates a pending settlement transaction.
 */
export async function createSettlement(
  userId: string,
  input: CreateSettlementInput,
): Promise<HydratedSettlement> {
  await ensureTripMember(userId, input.tripId);
  await ensureTripMember(input.payeeId, input.tripId);

  if (userId === input.payeeId) {
    throw new Error('You cannot settle up with yourself');
  }

  const [created] = await db
    .insert(settlements)
    .values({
      trip_id: input.tripId,
      payer_id: userId,
      payee_id: input.payeeId,
      amount: input.amount,
      status: 'pending',
    })
    .returning();

  if (!created) throw new Error('Failed to record settlement');

  const members = await loadTripMembers(input.tripId);
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const payer = memberMap.get(created.payer_id);
  const payee = memberMap.get(created.payee_id);

  return {
    ...created,
    payerName: payer?.name ?? 'Traveller',
    payerAvatarUrl: payer?.avatarUrl ?? null,
    payeeName: payee?.name ?? 'Traveller',
    payeeAvatarUrl: payee?.avatarUrl ?? null,
  };
}

/**
 * Confirms a settlement as completed (marks as paid).
 */
export async function confirmSettlement(
  userId: string,
  settlementId: string,
): Promise<HydratedSettlement> {
  const [settlement] = await db
    .select()
    .from(settlements)
    .where(eq(settlements.id, settlementId))
    .limit(1);

  if (!settlement) {
    throw new NotFoundError('Settlement not found');
  }

  // Ensure caller is the payee (recipient of money), since they should be the one confirming they received it.
  if (settlement.payee_id !== userId) {
    throw new ForbiddenError('Only the recipient of the settlement can confirm it');
  }

  const [updated] = await db
    .update(settlements)
    .set({ status: 'completed', updated_at: new Date().toISOString() })
    .where(eq(settlements.id, settlementId))
    .returning();

  if (!updated) throw new Error('Failed to confirm settlement');

  const members = await loadTripMembers(updated.trip_id);
  const memberMap = new Map(members.map((m) => [m.userId, m]));
  const payer = memberMap.get(updated.payer_id);
  const payee = memberMap.get(updated.payee_id);

  return {
    ...updated,
    payerName: payer?.name ?? 'Traveller',
    payerAvatarUrl: payer?.avatarUrl ?? null,
    payeeName: payee?.name ?? 'Traveller',
    payeeAvatarUrl: payee?.avatarUrl ?? null,
  };
}

export interface UpdateTripBudgetInput {
  tripId: string;
  amount: number;
}

/**
 * Upserts a global budget for the trip.
 */
export async function updateTripBudget(
  userId: string,
  input: UpdateTripBudgetInput,
): Promise<TripBudget> {
  await ensureTripMember(userId, input.tripId);

  // Check if a budget already exists
  const [existing] = await db
    .select()
    .from(tripBudgets)
    .where(and(eq(tripBudgets.trip_id, input.tripId), sql`${tripBudgets.category} is null`))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(tripBudgets)
      .set({ amount: input.amount, updated_at: new Date().toISOString() })
      .where(eq(tripBudgets.id, existing.id))
      .returning();
    if (!updated) throw new Error('Failed to update budget');
    return updated;
  } else {
    const [created] = await db
      .insert(tripBudgets)
      .values({
        trip_id: input.tripId,
        amount: input.amount,
      })
      .returning();
    if (!created) throw new Error('Failed to create budget');
    return created;
  }
}

export interface SavePaymentDetailsInput {
  promptpayId?: string | null;
  qrCodeUrl?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  isShowMobileBanking?: boolean;
  isShowPromptpay?: boolean;
}

/**
 * Saves payment details for the user.
 */
export async function saveUserPaymentDetails(
  userId: string,
  input: SavePaymentDetailsInput,
): Promise<UserPaymentDetail> {
  const [existing] = await db
    .select()
    .from(userPaymentDetails)
    .where(eq(userPaymentDetails.user_id, userId))
    .limit(1);

  if (existing) {
    let nextShowPromptpay = existing.is_show_promptpay;
    let nextShowMobileBanking = existing.is_show_mobile_banking;

    if (input.isShowPromptpay !== undefined) {
      nextShowPromptpay = input.isShowPromptpay;
      nextShowMobileBanking = !input.isShowPromptpay;
    } else if (input.isShowMobileBanking !== undefined) {
      nextShowMobileBanking = input.isShowMobileBanking;
      nextShowPromptpay = !input.isShowMobileBanking;
    }

    // Compute final values to perform validation
    const finalPromptpayId =
      input.promptpayId !== undefined ? input.promptpayId : existing.promptpay_id;
    const finalQrCodeUrl = input.qrCodeUrl !== undefined ? input.qrCodeUrl : existing.qr_code_url;
    const finalBankName = input.bankName !== undefined ? input.bankName : existing.bank_name;
    const finalBankAccountNumber =
      input.bankAccountNumber !== undefined
        ? input.bankAccountNumber
        : existing.bank_account_number;
    const finalBankAccountName =
      input.bankAccountName !== undefined ? input.bankAccountName : existing.bank_account_name;

    const hasPromptPay = !!(finalPromptpayId?.trim() || finalQrCodeUrl?.trim());
    const hasBank = !!(
      finalBankName?.trim() &&
      finalBankAccountNumber?.trim() &&
      finalBankAccountName?.trim()
    );

    if (nextShowPromptpay && !hasPromptPay) {
      throw new Error(
        'Cannot set PromptPay as preferred channel because no PromptPay ID or QR Code image is provided.',
      );
    }
    if (nextShowMobileBanking && !hasBank) {
      throw new Error(
        'Cannot set Mobile Banking as preferred channel because bank account details are incomplete. Please fill in Bank Name, Account Number, and Account Holder Name.',
      );
    }

    const [updated] = await db
      .update(userPaymentDetails)
      .set({
        promptpay_id: input.promptpayId !== undefined ? input.promptpayId : existing.promptpay_id,
        qr_code_url: input.qrCodeUrl !== undefined ? input.qrCodeUrl : existing.qr_code_url,
        bank_name: input.bankName !== undefined ? input.bankName : existing.bank_name,
        bank_account_number:
          input.bankAccountNumber !== undefined
            ? input.bankAccountNumber
            : existing.bank_account_number,
        bank_account_name:
          input.bankAccountName !== undefined ? input.bankAccountName : existing.bank_account_name,
        is_show_mobile_banking: nextShowMobileBanking,
        is_show_promptpay: nextShowPromptpay,
        updated_at: new Date().toISOString(),
      })
      .where(eq(userPaymentDetails.id, existing.id))
      .returning();
    if (!updated) throw new Error('Failed to update payment details');
    return updated;
  } else {
    let nextShowPromptpay = true;
    let nextShowMobileBanking = false;

    if (input.isShowPromptpay !== undefined) {
      nextShowPromptpay = input.isShowPromptpay;
      nextShowMobileBanking = !input.isShowPromptpay;
    } else if (input.isShowMobileBanking !== undefined) {
      nextShowMobileBanking = input.isShowMobileBanking;
      nextShowPromptpay = !input.isShowMobileBanking;
    }

    // Compute final values to perform validation
    const finalPromptpayId = input.promptpayId || null;
    const finalQrCodeUrl = input.qrCodeUrl || null;
    const finalBankName = input.bankName || null;
    const finalBankAccountNumber = input.bankAccountNumber || null;
    const finalBankAccountName = input.bankAccountName || null;

    const hasPromptPay = !!(finalPromptpayId?.trim() || finalQrCodeUrl?.trim());
    const hasBank = !!(
      finalBankName?.trim() &&
      finalBankAccountNumber?.trim() &&
      finalBankAccountName?.trim()
    );

    if (nextShowPromptpay && !hasPromptPay) {
      throw new Error(
        'Cannot set PromptPay as preferred channel because no PromptPay ID or QR Code image is provided.',
      );
    }
    if (nextShowMobileBanking && !hasBank) {
      throw new Error(
        'Cannot set Mobile Banking as preferred channel because bank account details are incomplete. Please fill in Bank Name, Account Number, and Account Holder Name.',
      );
    }

    const [created] = await db
      .insert(userPaymentDetails)
      .values({
        user_id: userId,
        promptpay_id: input.promptpayId || null,
        qr_code_url: input.qrCodeUrl || null,
        bank_name: input.bankName || null,
        bank_account_number: input.bankAccountNumber || null,
        bank_account_name: input.bankAccountName || null,
        is_show_mobile_banking: nextShowMobileBanking,
        is_show_promptpay: nextShowPromptpay,
      })
      .returning();
    if (!created) throw new Error('Failed to create payment details');
    return created;
  }
}

/**
 * Gets payment details for the user.
 */
export async function getUserPaymentDetails(userId: string): Promise<UserPaymentDetail | null> {
  const [details] = await db
    .select()
    .from(userPaymentDetails)
    .where(eq(userPaymentDetails.user_id, userId))
    .limit(1);
  return details ?? null;
}
