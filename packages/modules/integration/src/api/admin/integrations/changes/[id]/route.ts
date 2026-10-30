import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { service, maskSecretValues, withProviderId } from "../../_helpers"
import type { AdminIntegrationChangeResponse } from "../../../../../types"

/** One history entry with every column, including where the request came from. */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationChangeResponse>
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const svc = service(req)

  const {
    data: [change],
  } = await query.graph(
    {
      entity: "integration_change",
      filters: { id: req.params.id },
      fields: withProviderId(req.queryConfig?.fields),
    },
    { throwIfKeyNotFound: true }
  )

  res.json({ integration_change: maskSecretValues(change as any, svc.getProviderDescriptor((change as any).provider_id)) })
}
