import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { service } from "./_helpers"
import type { AdminIntegrationListResponse } from "../../../types"
import type { AdminGetIntegrationsParamsType } from "./validators"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationListResponse>
) => {
  const svc = service(req)
  const { q, category, limit, offset } = (req.validatedQuery ?? {}) as AdminGetIntegrationsParamsType
  const resolvedLimit = limit ?? 20
  const resolvedOffset = offset ?? 0

  const { integrations, count, categories } = await svc.listIntegrationsOverview({
    q,
    category,
    limit: resolvedLimit,
    offset: resolvedOffset,
  })

  res.json({
    integrations,
    count,
    limit: resolvedLimit,
    offset: resolvedOffset,
    categories,
    docs_url: svc.getDocsUrl(),
  })
}
