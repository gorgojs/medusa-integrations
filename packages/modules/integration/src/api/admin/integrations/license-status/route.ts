import { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { service } from "../_helpers"
import type { AdminIntegrationLicenseStatusResponse } from "../../../../types"

/**
 * Read-only view of the license verdict per package, as decided at boot by the
 * `checkLicenses` loader. There is no way to submit a key here — the key lives in
 * the environment (`GORGO_LICENSE`) and nowhere else.
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse<AdminIntegrationLicenseStatusResponse>
) => {
  res.json({ packages: service(req).listLicenseStates() })
}
