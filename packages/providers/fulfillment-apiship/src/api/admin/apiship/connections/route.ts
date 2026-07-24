import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { createApishipConnectionsWorkflow } from "../../../../workflows/create-apiship-connections"
import { getApishipConnectionsWorkflow } from "../../../../workflows/get-apiship-connections"
import { refetchConnection } from "./helpers"
import {
  AdminApishipConnectionResponse,
  AdminApishipConnectionListResponse,
} from "../../../../types/http/apiship"

import { AdminCreateApishipConnectionType } from "../validators"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse<AdminApishipConnectionListResponse>
) => {
  const { result } = await getApishipConnectionsWorkflow(req.scope).run()
  
  res.status(200).json({
    connections: result
  })
}

export const POST = async (
  req: MedusaRequest<AdminCreateApishipConnectionType>,
  res: MedusaResponse<AdminApishipConnectionResponse>
) => {
  const { result } = await createApishipConnectionsWorkflow(req.scope).run({
    input: { connections: [req.validatedBody] },
  })

  const connection = await refetchConnection(result[0].id)

  res.status(200).json({ connection })
}

