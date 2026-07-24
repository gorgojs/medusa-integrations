import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { setIntegrationEnabledWorkflow } from "../../../../../workflows/integration"
import { service, maskedView, requireProvider } from "../../_helpers"
import type { AdminSetIntegrationEnabledType } from "../../validators"
import type { AdminIntegrationUpsertResponse } from "../../../../../types"

/** Enable or disable a configured integration (toggles `is_enabled`). */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminSetIntegrationEnabledType>,
  res: MedusaResponse<AdminIntegrationUpsertResponse>
) => {
  const svc = service(req)
  const provider_id = req.params.provider_id
  requireProvider(svc, provider_id)

  const { result } = await setIntegrationEnabledWorkflow(req.scope).run({
    input: { provider_id, is_enabled: req.validatedBody.is_enabled },
  })
  res.json({ integration: maskedView(result, svc.getSecretKeys(provider_id)) })
}
