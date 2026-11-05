import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { service } from "../../_helpers"
import type { AdminIntegrationChangeFieldsResponse } from "../../../../../types"

/** Every option the change history names: what the history page matches its search against. */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationChangeFieldsResponse>
) => {
  res.json({ fields: await service(req).listChangeFields() })
}
