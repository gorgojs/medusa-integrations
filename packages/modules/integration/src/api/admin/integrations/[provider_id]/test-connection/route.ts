import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { testIntegrationConnectionWorkflow } from "../../../../../workflows/integration"
import { service, requireProvider } from "../../_helpers"
import type { AdminIntegrationTestResponse } from "../../../../../types"

export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationTestResponse>
) => {
  const svc = service(req)
  const provider_id = req.params.provider_id
  requireProvider(svc, provider_id)
  const { result } = await testIntegrationConnectionWorkflow(req.scope).run({
    input: { provider_id },
  })
  res.json(result)
}
