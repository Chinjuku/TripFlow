import type {
  Expense,
  ExpenseSplit,
  Settlement,
  TripBudget,
  UserPaymentDetail,
} from '@trip-flow/db/server';

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

export interface DebtRelation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  amount: number;
}

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
  treasurerId: string | null;
  centralFundPerPerson: number | null;
  centralFundTotal: number;
  centralFundSpent: number;
}

export interface FinancesData {
  summary: FinanceSummary;
  expenses: HydratedExpense[];
  settlements: HydratedSettlement[];
}
