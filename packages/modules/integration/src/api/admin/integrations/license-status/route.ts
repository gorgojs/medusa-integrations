import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { service } from "../_helpers"
import type { AdminIntegrationLicenseStatusResponse } from "../../../../types"

/**
 * Read-only view of the license verdict per package, read live from `@gorgo/license` in this
 * process. Nothing here calls the platform, and there is no way to submit a key: it lives in the
 * environment (`GORGO_LICENSE`) and nowhere else.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationLicenseStatusResponse>
) => {
  res.json({ packages: service(req).listLicenseStates() })
}
