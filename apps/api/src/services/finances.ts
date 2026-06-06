import {
  db,
  trips,
  expenses,
  expenseSplits,
  settlements,
  tripBudgets,
  userPaymentDetails,
  tripMembers,
  type TripBudget,
  type UserPaymentDetail,
} from '@trip-flow/db/server';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { NotFoundError } from '../errors/domain';
import { loadTripMembers, type TripMemberProfile } from './trips';
import type { 
  DebtRelation, 
  FinanceSummary, 
  HydratedExpense, 
  HydratedExpenseSplit, 
  HydratedSettlement, 
  FinancesData 
} from '../models/finances';

/**
 * Assures user is a member of the trip, otherwise throws NotFoundError.
 */
export async function ensureTripMember(userId: string, tripId: string) {
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
  isDebtOptimizedOverride?: boolean,
): Promise<FinancesData> {
  await ensureTripMember(userId, tripId);

  // 1. Kick off independent queries concurrently
  const membersPromise = loadTripMembers(tripId);
  const expensesPromise = db
    .select()
    .from(expenses)
    .where(eq(expenses.trip_id, tripId))
    .orderBy(desc(expenses.expense_date), desc(expenses.created_at));
  const settlementsPromise = db
    .select()
    .from(settlements)
    .where(eq(settlements.trip_id, tripId))
    .orderBy(desc(settlements.created_at));
  const budgetPromise = db
    .select()
    .from(tripBudgets)
    .where(and(eq(tripBudgets.trip_id, tripId), sql`${tripBudgets.category} is null`))
    .limit(1);
  const tripPromise = db.select().from(trips).where(eq(trips.id, tripId)).limit(1);

  // Wait for the first wave of queries
  const [members, rawExpenses, rawSettlements, [budget], [tripRow]] = await Promise.all([
    membersPromise,
    expensesPromise,
    settlementsPromise,
    budgetPromise,
    tripPromise,
  ]);

  const finalIsDebtOptimized =
    isDebtOptimizedOverride !== undefined
      ? isDebtOptimizedOverride
      : (tripRow?.is_debt_optimized ?? false);

  const memberMap = new Map<string, TripMemberProfile>();
  const memberUserIds: string[] = [];
  for (const m of members) {
    memberMap.set(m.userId, m);
    memberUserIds.push(m.userId);
  }

  const expenseIds = rawExpenses.map((e) => e.id);

  // 2. Kick off dependent queries concurrently
  const splitsPromise =
    expenseIds.length > 0
      ? db.select().from(expenseSplits).where(inArray(expenseSplits.expense_id, expenseIds))
      : Promise.resolve([]);

  const paymentsPromise =
    memberUserIds.length > 0
      ? db
          .select()
          .from(userPaymentDetails)
          .where(inArray(userPaymentDetails.user_id, memberUserIds))
      : Promise.resolve([]);

  const [rawSplits, paymentRows] = await Promise.all([splitsPromise, paymentsPromise]);

  const splitsByExpense = new Map<string, any[]>();
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

  // Hydrate settlements
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

  const paymentDetailsRecord: Record<string, UserPaymentDetail> = {};
  for (const row of paymentRows) {
    paymentDetailsRecord[row.user_id] = row;
  }

  // ==========================================
  // Calculations
  // ==========================================

  // A. Total Group Cost & Central Fund
  let totalGroupCost = 0;
  let centralFundSpent = 0;
  for (const exp of rawExpenses) {
    totalGroupCost += exp.amount;
    if (exp.is_central_fund) {
      centralFundSpent += exp.amount;
    }
  }

  const centralFundPerPerson = tripRow?.central_fund_per_person ?? null;
  const centralFundTotal = centralFundPerPerson ? centralFundPerPerson * members.length : 0;

  // Also count completed central fund settlements (reimbursements) where the treasurer pays members
  for (const set of rawSettlements) {
    if (
      set.is_central_fund &&
      set.status === 'completed' &&
      set.payer_id === tripRow?.treasurer_id
    ) {
      centralFundSpent += set.amount;
    }
  }

  // B. Net Balances Calculation (based on expenses, splits, and completed settlements)
  const netBalances: Record<string, number> = {};
  for (const m of members) {
    netBalances[m.userId] = 0;
  }

  const centralFundExpenseIds = new Set(
    rawExpenses.filter((e) => e.is_central_fund).map((e) => e.id),
  );

  // Plus amount paid in expenses
  for (const exp of rawExpenses) {
    if (exp.is_central_fund) continue;
    const payerId = exp.paid_by_id;
    if (netBalances[payerId] !== undefined) {
      netBalances[payerId] += exp.amount;
    }
  }

  // Minus split amounts owed
  for (const split of rawSplits) {
    if (centralFundExpenseIds.has(split.expense_id)) continue;
    const userId = split.user_id;
    if (netBalances[userId] !== undefined) {
      netBalances[userId] -= split.amount;
    }
  }

  // Apply COMPLETED settlements
  for (const set of rawSettlements) {
    if (set.is_central_fund) continue;
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
    if (exp.is_central_fund) continue;
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
    if (set.is_central_fund) continue;
    if (set.status === 'completed') {
      // set.payer_id paid set.payee_id, reducing what payer_id owes payee_id
      const debtorDebts = pairwiseDebt[set.payer_id];
      if (debtorDebts) {
        debtorDebts[set.payee_id] = (debtorDebts[set.payee_id] ?? 0) - set.amount;
      }
    }
  }

  if (finalIsDebtOptimized) {
    // Net the pairwise debts for all pairs of members
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        const u1 = members[i]!.userId;
        const u2 = members[j]!.userId;

        const u1OwesU2 = pairwiseDebt[u1]?.[u2] ?? 0;
        const u2OwesU1 = pairwiseDebt[u2]?.[u1] ?? 0;

        if (u1OwesU2 > 0 || u2OwesU1 > 0) {
          const net = u1OwesU2 - u2OwesU1;
          if (net > 0) {
            pairwiseDebt[u1]![u2] = net;
            pairwiseDebt[u2]![u1] = 0;
          } else {
            pairwiseDebt[u1]![u2] = 0;
            pairwiseDebt[u2]![u1] = -net;
          }
        }
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
      treasurerId: tripRow?.treasurer_id ?? null,
      centralFundPerPerson,
      centralFundTotal,
      centralFundSpent: Number(centralFundSpent.toFixed(2)),
    },
    expenses: hydratedExpenses,
    settlements: hydratedSettlements,
  };
}

/**
 * Updates the global trip optimization setting in the DB.
 */
export async function updateTripOptimization(
  userId: string,
  tripId: string,
  isOptimized: boolean,
): Promise<any> {
  await ensureTripMember(userId, tripId);

  const [updated] = await db
    .update(trips)
    .set({ is_debt_optimized: isOptimized })
    .where(eq(trips.id, tripId))
    .returning();

  if (!updated) {
    throw new Error('Failed to update trip optimization setting');
  }

  return updated;
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
