import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { service, requireProvider, maskSecretValues } from "../../_helpers"
import type { AdminIntegrationChangeListResponse } from "../../../../../types"

/** The change history of one integration, newest first. 404 for an unregistered provider. */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationChangeListResponse>
) => {
  const svc = service(req)
  const provider_id = req.params.provider_id
  requireProvider(svc, provider_id)
  const descriptor = svc.getProviderDescriptor(provider_id)
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data, metadata: { count, take, skip } = {} as any } = await query.graph({
    entity: "integration_change",
    ...req.queryConfig,
    // The URL decides the provider, whatever the query string says.
    filters: { ...req.filterableFields, provider_id },
  })

  res.json({
    integration_changes: data.map((c: any) => maskSecretValues(c, descriptor)),
    count,
    offset: skip,
    limit: take,
  })
}
