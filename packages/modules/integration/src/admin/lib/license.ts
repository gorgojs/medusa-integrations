import { toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "./sdk"
import type { AdminIntegrationLicenseStatusResponse } from "../../types"
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

/** Where the merchant manages the project, its domains and its key. */
export const GORGO_ACCOUNT_URL = "https://app.gorgojs.com"

/** Verdicts this backend process holds. Nothing here calls the license platform. */
export function useLicenseStatus() {
  return useQuery({
    queryKey: LICENSE_STATUS_QUERY_KEY,
    queryFn: () => sdk.client.fetch<AdminIntegrationLicenseStatusResponse>("/admin/integrations/license-status"),
    staleTime: 60_000,
  })
}

/** "Check now": the backend asks the platform right away and answers with the fresh verdicts. */
export function useRecheckLicense() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      sdk.client.fetch<AdminIntegrationLicenseStatusResponse>("/admin/integrations/license-status/recheck", {
        method: "POST",
      }),
    onSuccess: (data) => {
      qc.setQueryData(LICENSE_STATUS_QUERY_KEY, data)
      toast.success(t("integration.license.card.rechecked"))
    },
    onError: (e: any) => toast.error(e?.message ?? t("integration.license.card.recheckFailed")),
  })
}
