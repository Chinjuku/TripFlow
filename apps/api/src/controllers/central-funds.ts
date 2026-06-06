import * as centralFundsService from '../services/central-funds';

type AuthContext = { user: { sub: string } };

export async function handleUpdateCentralFund({
  user,
  params,
  body,
}: AuthContext & { params: { tripId: string }; body: any }) {
  return await centralFundsService.updateCentralFund(user.sub, {
    tripId: params.tripId,
    treasurerId: body.treasurerId ?? null,
    centralFundPerPerson: body.centralFundPerPerson ?? null,
  });
}
