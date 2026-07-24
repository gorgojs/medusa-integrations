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

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<AdminApishipConnectionResponse>
) => {
  const connection = await refetchConnection(req.params.id)

  if (!connection) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `ApiShip connection with id: ${req.params.id} not found`
    )
  }

  res.status(200).json({ connection })
}

export const POST = async (
  req: MedusaRequest<AdminUpdateApishipConnection>,
  res: MedusaResponse<AdminApishipConnectionResponse>
) => {
  const existingConnection = await refetchConnection(req.params.id)
  if (!existingConnection) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Connection with id "${req.params.id}" not found`
    )
  }

  const { result } = await updateApishipConnectionWorkflow(req.scope).run({
    input: {
      id: req.params.id,
      update: req.validatedBody
    },
  })

  const connection = await refetchConnection(result.id)

  res.status(200).json({ connection })
}

export const DELETE = async (
  req: MedusaRequest,
  res: MedusaResponse<AdminApishipConnectionDeleteResponse>
) => {
  const id = req.params.id

  await deleteApishipConnectionsWorkflow(req.scope).run({
    input: { ids: [id] }
  })

  res.status(200).json({
    id,
    object: "connection",
    deleted: true,
  })
}


