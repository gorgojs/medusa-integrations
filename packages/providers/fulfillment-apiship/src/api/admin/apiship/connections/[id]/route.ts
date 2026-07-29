import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { refetchConnection } from "../helpers"
import { MedusaError } from "@medusajs/framework/utils"
import { updateApishipConnectionWorkflow } from "../../../../../workflows/update-apiship-connection"
import { deleteApishipConnectionsWorkflow } from "../../../../../workflows/delete-apiship-connections"
import {
  AdminApishipConnectionResponse,
  AdminUpdateApishipConnection,
  AdminApishipConnectionDeleteResponse
} from "../../../../../types/http/apiship"
import { AdminApishipProviderIdQueryType } from "../../validators"

export const GET = async (
  req: MedusaRequest<unknown, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipConnectionResponse>
) => {
  const { provider_id } = req.validatedQuery
  const connection = await refetchConnection(req.params.id, provider_id)

  if (!connection) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `ApiShip connection with id: ${req.params.id} not found`
    )
  }

  res.status(200).json({ connection })
}

export const POST = async (
  req: MedusaRequest<AdminUpdateApishipConnection, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipConnectionResponse>
) => {
  const { provider_id } = req.validatedQuery
  const existingConnection = await refetchConnection(req.params.id, provider_id)
  if (!existingConnection) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Connection with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateApishipConnectionWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      provider_id,
      update: req.validatedBody
    },
  })

  const connection = await refetchConnection(result.id, provider_id)

  res.status(200).json({ connection })
}

export const DELETE = async (
  req: MedusaRequest<unknown, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipConnectionDeleteResponse>
) => {
  const id = req.params.id
  const { provider_id } = req.validatedQuery

  await deleteApishipConnectionsWorkflow(req.scope).run({
    input: { ids: [id], provider_id }
  })

  res.status(200).json({
    id,
    object: "connection",
    deleted: true,
  })
}


