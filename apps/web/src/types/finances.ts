import { api } from '@/lib/api';

// Derive exact types from the Elysia E2E schema definition
type AppResponse<T> = T extends (...args: any[]) => Promise<{ data: infer D }>
  ? NonNullable<D>
  : never;

export type FinancesData = AppResponse<(typeof api)['finances']['trip'][string]['get']>;

export type FinanceSummary = FinancesData['summary'];
export type DebtRelation = FinanceSummary['whoOwesYou'][number];
export type HydratedExpense = FinancesData['expenses'][number];
export type HydratedExpenseSplit = HydratedExpense['splits'][number];
export type HydratedSettlement = FinancesData['settlements'][number];
export type UserPaymentDetail = NonNullable<FinanceSummary['paymentDetails'][string]>;

/** A single expense line shown inside a debtor/creditor settlement card. */
export interface Transaction {
  id: string;
  description: string;
  date: string;
  amount: number;
  category: 'food' | 'transport' | 'accommodation' | 'activity' | 'shopping' | 'lodging' | 'other';
}

export interface CreateExpensePayload {
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

export interface CreateSettlementPayload {
  tripId: string;
  payeeId: string;
  payerId?: string;
  amount: number;
  isCentralFund?: boolean;
}

export interface UpdateBudgetPayload {
  tripId: string;
  amount: number;
}

export interface UpdateCentralFundPayload {
  tripId: string;
  treasurerId: string | null;
  centralFundPerPerson: number | null;
}

export interface SavePaymentDetailsPayload {
  promptpayId?: string | null;
  qrCodeUrl?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  isShowMobileBanking?: boolean;
  isShowPromptpay?: boolean;
}
