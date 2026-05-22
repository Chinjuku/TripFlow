// Generouted, changes to this file will be overridden
/* eslint-disable */

import { components, hooks, utils } from '@generouted/react-router/client'

export type Path =
  | `/`
  | `/example`
  | `/login`
  | `/settings`
  | `/trips`
  | `/trips/:id`
  | `/trips/:id/plan`
  | `/trips/:id/schedule`

export type Params = {
  '/trips/:id': { id: string }
  '/trips/:id/plan': { id: string }
  '/trips/:id/schedule': { id: string }
}

export type ModalPath = never

export const { Link, Navigate } = components<Path, Params>()
export const { useModals, useNavigate, useParams } = hooks<Path, Params, ModalPath>()
export const { redirect } = utils<Path, Params>()
