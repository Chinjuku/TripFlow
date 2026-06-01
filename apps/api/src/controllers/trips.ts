/**
 * Trips controller — HTTP request/response adapter.
 *
 * Extracts HTTP concerns and delegates business logic to the trips service.
 */

import * as tripsService from '../services/trips';

type AuthContext = { user: { sub: string } };

export async function handleListTripsForUser({ user }: AuthContext) {
  const trips = await tripsService.listTripsForUser(user.sub);
  return { trips };
}

export async function handleCreateTrip({ user, body }: AuthContext & { body: any }) {
  const trip = await tripsService.createTrip(user.sub, body);
  return { trip };
}

export async function handleJoinTripByCode({
  user,
  body,
}: AuthContext & { body: { inviteCode: string } }) {
  const trip = await tripsService.joinTripByCode(user.sub, body.inviteCode);
  return { trip };
}

export async function handleGetTripDetail({
  user,
  params,
}: AuthContext & { params: { id: string } }) {
  const trip = await tripsService.getTripDetail(user.sub, params.id);
  return { trip };
}

export async function handleUpdateTrip({
  user,
  params,
  body,
}: AuthContext & { params: { id: string }; body: any }) {
  const trip = await tripsService.updateTrip(user.sub, params.id, body);
  return { trip };
}

export async function handleRemoveMember({
  user,
  params,
}: AuthContext & { params: { id: string; userId: string } }) {
  await tripsService.removeMember(user.sub, params.id, params.userId);
  return { ok: true };
}

export async function handleDeleteTrip({
  user,
  params,
}: AuthContext & { params: { id: string } }) {
  await tripsService.deleteTrip(user.sub, params.id);
  return { ok: true };
}
