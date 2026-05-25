import { api } from '@/lib/api';
import type {
  FinancesData,
  CreateExpensePayload,
  CreateSettlementPayload,
  UpdateBudgetPayload,
  SavePaymentDetailsPayload,
  HydratedExpense,
  HydratedSettlement,
  UserPaymentDetail,
} from './types';

function unwrap<T>(value: { data: T | null; error: any }): T {
  if (value.error) {
    let message = 'Request failed';
    if (typeof value.error === 'object' && value.error !== null) {
      const errObj = value.error as Record<string, unknown>;
      // Check Eden's parsed JSON response body first (value.error.value)
      if (errObj.value && typeof errObj.value === 'object') {
        const valObj = errObj.value as Record<string, unknown>;
        if (typeof valObj.message === 'string') {
          message = valObj.message;
        } else if (typeof valObj.error === 'string') {
          message = valObj.error;
        } else {
          message = JSON.stringify(valObj);
        }
      } else if (typeof errObj.value === 'string') {
        message = errObj.value;
      } else if (typeof errObj.message === 'string') {
        message = errObj.message;
      }
    }
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

export async function createSettlement(
  payload: CreateSettlementPayload,
): Promise<HydratedSettlement> {
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

export async function optimizeTrip(tripId: string, isOptimized: boolean): Promise<any> {
  const res = await api.finances.trip[tripId]!.optimize.post({ isOptimized });
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

export async function verifySlip(id: string, file: File): Promise<{ isMatch: boolean; reason?: string; settlement?: HydratedSettlement }> {
  const res = await api.finances.settlement[id]!['verify-slip'].post({
    slip_image: file,
  });
  return unwrap(res) as { isMatch: boolean; reason?: string; settlement?: HydratedSettlement };
}

export async function extractReceipt(file: File): Promise<{
  merchant: string | null;
  amount: number | null;
  datetime: string | null;
  sender_name?: string | null;
  bank_name?: string | null;
}> {
  const res = await api.finances['extract-receipt'].post({
    slip_image: file,
  });
  return unwrap(res) as {
    merchant: string | null;
    amount: number | null;
    datetime: string | null;
    sender_name?: string | null;
    bank_name?: string | null;
  };
}
