// * Hook
export { useTripFinances } from '@/hooks/useFinances';

// * API
export {
  getFinances,
  createExpense,
  createSettlement,
  confirmSettlement,
  deleteSettlement,
  updateBudget,
  optimizeTrip,
  savePaymentDetails,
  getPaymentDetails,
  verifySlip,
  extractReceipt,
  updateCentralFund,
} from '@/api/finances';

// * Types
export type {
  FinancesData,
  FinanceSummary,
  DebtRelation,
  HydratedExpense,
  HydratedExpenseSplit,
  HydratedSettlement,
  CreateExpensePayload,
  CreateSettlementPayload,
  UpdateCentralFundPayload,
  SavePaymentDetailsPayload,
} from '@/types/finances';

// * Shell
export { TripFinancesLayout, useTripFinancesContext } from './shell/TripFinancesLayout';

// * Expenses
export { ExpenseSummary } from './expenses/ExpenseSummary';
export { ExpenseList } from './expenses/ExpenseList';
export { CreateExpenseModal } from './expenses/CreateExpenseModal';
export { AllExpenseItem } from './expenses/AllExpenseItem';
export { AllExpensesSkeleton } from './expenses/AllExpensesSkeleton';

// * Settlement
export { SettleUpModal } from './settlement/SettleUpModal';
export { SettlementHelpNote } from './settlement/SettlementHelpNote';
export { CreditorCard, type Creditor } from './settlement/CreditorCard';
export { DebtorCard, type Debtor } from './settlement/DebtorCard';

// * Budget
export { BudgetModal } from './budget/BudgetModal';

// * Payment
export { PaymentDetailsModal } from './payment/PaymentDetailsModal';

// * Central fund
export { CentralFundCard } from './central-fund/CentralFundCard';
export { CentralFundMembers } from './central-fund/CentralFundMembers';
export { PayCentralFundModal } from './central-fund/PayCentralFundModal';
export { RequestReimbursementModal } from './central-fund/RequestReimbursementModal';
