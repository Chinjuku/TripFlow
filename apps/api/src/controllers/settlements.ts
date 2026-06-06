import * as settlementsService from '../services/settlements';

type AuthContext = { user: { sub: string } };

export async function handleCreateSettlement({ user, body }: AuthContext & { body: any }) {
  return await settlementsService.createSettlement(user.sub, body);
}

export async function handleConfirmSettlement({
  user,
  params,
}: AuthContext & { params: { id: string } }) {
  return await settlementsService.confirmSettlement(user.sub, params.id);
}

export async function handleDeleteSettlement({
  user,
  params,
}: AuthContext & { params: { id: string } }) {
  return await settlementsService.deleteSettlement(user.sub, params.id);
}
