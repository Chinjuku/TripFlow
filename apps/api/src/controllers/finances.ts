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
  const isDebtOptimizedOverride = query.optimized === 'true'
    ? true
    : query.optimized === 'false'
    ? false
    : undefined;
  return await financesService.getFinancesByTripId(user.sub, params.tripId, isDebtOptimizedOverride);
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

export async function handleUpdateCentralFund({
  user,
  params,
  body,
}: AuthContext & { params: { tripId: string }; body: any }) {
  return await financesService.updateCentralFund(user.sub, {
    tripId: params.tripId,
    treasurerId: body.treasurerId ?? null,
    centralFundPerPerson: body.centralFundPerPerson ?? null,
  });
}

export async function handleUpdateTripOptimization({
  user,
  params,
  body,
}: AuthContext & { params: { tripId: string }; body: { isOptimized: boolean } }) {
  return await financesService.updateTripOptimization(user.sub, params.tripId, body.isOptimized);
}

export async function handleSaveUserPaymentDetails({ user, body }: AuthContext & { body: any }) {
  return await financesService.saveUserPaymentDetails(user.sub, body);
}

export async function handleGetUserPaymentDetails({ user }: AuthContext) {
  return await financesService.getUserPaymentDetails(user.sub);
}

export async function handleVerifySlip({
  user,
  params,
  body,
}: AuthContext & { params: { id: string }; body: { slip_image: File } }) {
  const file = body.slip_image;
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  
  return await financesService.verifySlipService(
    user.sub,
    params.id,
    base64,
    file.type
  );
}

export async function handleExtractReceipt({
  body,
}: { body: { slip_image: File } }) {
  const file = body.slip_image;
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  
  return await financesService.extractReceiptService(
    base64,
    file.type
  );
}
