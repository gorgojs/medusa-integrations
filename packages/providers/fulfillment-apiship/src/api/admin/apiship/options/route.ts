import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { updateApishipOptionsWorkflow } from "../../../../workflows/update-apiship-options"
import { getApishipOptionsWorkflow } from "../../../../workflows/get-apiship-options"
import {
  AdminApishipOptions,
  AdminUpdateApishipOptions,
  AdminApishipOptionsResponse
} from "../../../../types/http"
import { AdminApishipProviderIdQueryType } from "../validators"

/**
 * The wire shape carries only what this plugin still owns: the connection list. Credentials,
 * payment & VAT, default product sizes and the sender are descriptor sections — the admin
 * reads them from `GET /admin/integrations/:provider_id`, and the token never leaves the
 * server at all.
 */
const readConnections = async (
  scope: MedusaRequest["scope"],
  provider_id?: string
): Promise<AdminApishipOptions> => {
  const { result } = await getApishipOptionsWorkflow(scope).run({ input: { provider_id } })
  return { connections: result.connections }
}

export const POST = async (
  req: MedusaRequest<AdminUpdateApishipOptions, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipOptionsResponse>
) => {
  const { provider_id } = req.validatedQuery

  await updateApishipOptionsWorkflow(req.scope).run({
    input: { provider_id, connections: req.validatedBody.connections },
  })

  res.status(200).json({
    apiship_options: await readConnections(req.scope, provider_id)
  })
}

export const GET = async (
  req: MedusaRequest<unknown, AdminApishipProviderIdQueryType>,
  res: MedusaResponse<AdminApishipOptionsResponse>
) => {
  const { provider_id } = req.validatedQuery

  res.status(200).json({
    apiship_options: await readConnections(req.scope, provider_id)
  })
}
