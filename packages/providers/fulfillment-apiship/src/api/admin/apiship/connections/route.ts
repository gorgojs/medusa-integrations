import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createApishipConnectionsWorkflow } from "../../../../workflows/create-apiship-connections"
import { getApishipConnectionsWorkflow } from "../../../../workflows/get-apiship-connections"
import { refetchConnection } from "./helpers"
import {
  AdminApishipConnectionResponse,
  AdminApishipConnectionListResponse,
} from "../../../../types/http/apiship"

import { AdminCreateApishipConnectionType, AdminApishipProviderIdQueryType } from "../validators"

export const GET = async (
  req: MedusaRequest<unknown, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipConnectionListResponse>
) => {
  const { provider_id } = req.validatedQuery

  const { result } = await getApishipConnectionsWorkflow(req.scope).run({
    input: { provider_id },
  })

  res.status(200).json({
    connections: result
  })
}

export const POST = async (
  req: MedusaRequest<AdminCreateApishipConnectionType, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipConnectionResponse>
) => {
  const { provider_id } = req.validatedQuery

  const { result } = await createApishipConnectionsWorkflow(req.scope).run({
    input: { connections: [req.validatedBody], provider_id },
  })

  const connection = await refetchConnection(result[0].id, provider_id)

  res.status(200).json({ connection })
}

