import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { service } from "../_helpers"
import type { AdminIntegrationCatalogResponse } from "../../../../types"

export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationCatalogResponse>
) => {
  const svc = service(req)
  res.json({ integrations: await svc.getCatalog() })
}
