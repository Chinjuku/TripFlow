/**
 * Places controller — HTTP request/response adapter.
 *
 * Extracts HTTP concerns and delegates business logic to the places service.
 */

import * as placesService from '../services/places';

type AuthContext = { user: { sub: string } };

export async function handleListPlaces({ user, params }: AuthContext & { params: { id: string } }) {
  const places = await placesService.listPlaces(user.sub, params.id);
  return { places };
}

export async function handleAddPlace({
  user,
  params,
  body,
}: AuthContext & { params: { id: string }; body: any }) {
  const place = await placesService.addPlace(user.sub, params.id, body);
  return { place };
}

export async function handleRemovePlace({
  user,
  params,
}: AuthContext & { params: { id: string; placeId: string } }) {
  await placesService.removePlace(user.sub, params.id, params.placeId);
  return { ok: true };
}

export async function handleSetLike({
  user,
  params,
  body,
}: AuthContext & { params: { id: string; placeId: string }; body: { liked: boolean } }) {
  const place = await placesService.setLike(user.sub, params.id, params.placeId, body.liked);
  return { place };
}
