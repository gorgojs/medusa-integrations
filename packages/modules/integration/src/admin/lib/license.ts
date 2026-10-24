import type { LicenseState } from "../../modules/integration/types"

type BadgeColor = "green" | "orange" | "red" | "grey"

/** Badge for a package's license verdict, shared by the integrations list, the license card and the Gorgo page. */
export const LICENSE_BADGE: Record<LicenseState, { color: BadgeColor; key: string }> = {
  pending: { color: "grey", key: "integration.license.state.pending" },
  ok: { color: "green", key: "integration.license.state.ok" },
  failed: { color: "red", key: "integration.license.state.failed" },
  unreachable: { color: "orange", key: "integration.license.state.unreachable" },
}

export const LICENSE_STATUS_QUERY_KEY = ["integration-license-status"]
