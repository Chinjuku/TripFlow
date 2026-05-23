/**
 * Finances controller — HTTP request/response adapter.
 *
 * Extracts HTTP concerns (params, query, body, user context) and delegates
 * all business logic to the finances service.
 */

import * as financesService from '../services/finances';

// Basic type for the Elysia context augmented with our auth user
type AuthContext = { user: { sub: string } };

export async function handleGetFinancesByTripId({
  user,
  params,
  query,
}: AuthContext & { params: { tripId: string }; query: { optimized?: string } }) {
  const isDebtOptimized = query.optimized === 'true';
  return await financesService.getFinancesByTripId(user.sub, params.tripId, isDebtOptimized);
}

export async function handleCreateExpense({ user, body }: AuthContext & { body: any }) {
  return await financesService.createExpense(user.sub, body);
}

export async function handleCreateSettlement({ user, body }: AuthContext & { body: any }) {
  return await financesService.createSettlement(user.sub, body);
}

export async function handleConfirmSettlement({
  user,
  params,
}: AuthContext & { params: { id: string } }) {
  return await financesService.confirmSettlement(user.sub, params.id);
}

export async function handleUpdateTripBudget({ user, body }: AuthContext & { body: any }) {
  return await financesService.updateTripBudget(user.sub, body);
}

export async function handleSaveUserPaymentDetails({ user, body }: AuthContext & { body: any }) {
  return await financesService.saveUserPaymentDetails(user.sub, body);
}

export async function handleGetUserPaymentDetails({ user }: AuthContext) {
  return await financesService.getUserPaymentDetails(user.sub);
}
