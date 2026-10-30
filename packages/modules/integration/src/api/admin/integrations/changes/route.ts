import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { service, maskSecretValues, withProviderId } from "../_helpers"
import type { AdminIntegrationChangeListResponse } from "../../../../types"

/** The change history of every integration, newest first. Read-only. */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationChangeListResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const svc = service(req)

  const { data, metadata: { count, take, skip } = {} as any } = await query.graph({
    entity: "integration_change",
    ...req.queryConfig,
    fields: withProviderId(req.queryConfig.fields),
    filters: req.filterableFields,
  })

  res.json({
    integration_changes: data.map((c: any) => maskSecretValues(c, svc.getProviderDescriptor(c.provider_id))),
    count,
    offset: skip,
    limit: take,
  })
}
