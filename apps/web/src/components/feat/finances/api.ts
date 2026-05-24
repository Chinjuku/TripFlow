import { api } from '@/lib/api';
import type { 
  FinancesData, 
  CreateExpensePayload, 
  CreateSettlementPayload, 
  UpdateBudgetPayload, 
  SavePaymentDetailsPayload,
  HydratedExpense,
  HydratedSettlement,
  UserPaymentDetail
} from './types';

function unwrap<T>(value: { data: T | null; error: unknown }): T {
  if (value.error) {
    const message =
      typeof value.error === 'object' && value.error !== null && 'message' in value.error
        ? String((value.error as { message: unknown }).message)
        : 'Request failed';
    throw new Error(message);
  }
  if (value.data === null) {
    throw new Error('Empty response');
  }
  return value.data;
}

export async function getFinances(tripId: string, optimized: boolean): Promise<FinancesData> {
  const res = await api.finances.trip[tripId]!.get({
    $query: { optimized: optimized ? 'true' : 'false' },
  });
  return unwrap(res) as FinancesData;
}

export async function createExpense(payload: CreateExpensePayload): Promise<HydratedExpense> {
  const res = await api.finances.expense.post(payload);
  return unwrap(res) as HydratedExpense;
}

export async function createSettlement(payload: CreateSettlementPayload): Promise<HydratedSettlement> {
  const res = await api.finances.settlement.post(payload);
  return unwrap(res) as HydratedSettlement;
}

export async function confirmSettlement(id: string): Promise<HydratedSettlement> {
  const res = await api.finances.settlement[id]!.confirm.post();
  return unwrap(res) as HydratedSettlement;
}

export async function updateBudget(payload: UpdateBudgetPayload): Promise<any> {
  const res = await api.finances.budget.post(payload);
  return unwrap(res);
}

export async function savePaymentDetails(payload: SavePaymentDetailsPayload): Promise<any> {
  const res = await api.finances['payment-details'].post(payload);
  return unwrap(res);
}

export async function getPaymentDetails(): Promise<UserPaymentDetail | null> {
  const res = await api.finances['payment-details'].get();
  // If no payment details recorded yet, the server might return null.
  // Handle empty or not found.
  if (res.error) {
    if (res.status === 404) return null;
    throw new Error(res.error.message || 'Failed to load payment details');
  }
  return res.data as UserPaymentDetail | null;
}

