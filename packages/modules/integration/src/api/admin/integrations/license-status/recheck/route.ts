import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { service } from "../../_helpers"
import type { AdminIntegrationLicenseStatusResponse } from "../../../../../types"

/**
 * "Check now": asks the platform about every licensed package right away instead of waiting for the
 * daily recheck, for a merchant who has just added a domain or renewed a subscription. Only this
 * process rechecks; other server instances catch up on their own schedule.
 */
export const POST = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationLicenseStatusResponse>
) => {
  res.json({ packages: await service(req).recheckLicenseStates() })
}
