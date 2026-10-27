import { toast } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "./sdk"
import { describeLicense, licenseFormat, type LicenseView } from "./describe-license"
import type { AdminIntegrationLicenseStatusResponse } from "../../types"
import type { LicenseStateEntry } from "../../modules/integration/types"

export const LICENSE_STATUS_QUERY_KEY = ["integration-license-status"]

/** The first check runs a few seconds after boot; until it answers, ask again this often. */
const PENDING_POLL_MS = 3_000

/** Verdicts this backend process holds. Nothing here calls the license platform. */
export function useLicenseStatus() {
  return useQuery({
    queryKey: LICENSE_STATUS_QUERY_KEY,
    queryFn: () => sdk.client.fetch<AdminIntegrationLicenseStatusResponse>("/admin/integrations/license-status"),
    staleTime: 60_000,
    refetchInterval: (query) =>
      query.state.data?.packages.some((entry) => entry.state === "pending") ? PENDING_POLL_MS : false,
  })
}

/** "Check now": the backend asks the platform right away, and the block redraws with the fresh verdict. */
export function useRecheckLicense() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () =>
      sdk.client.fetch<AdminIntegrationLicenseStatusResponse>("/admin/integrations/license-status/recheck", {
        method: "POST",
      }),
    onSuccess: (data) => qc.setQueryData(LICENSE_STATUS_QUERY_KEY, data),
    onError: (e: any) => toast.error(e?.message ?? t("integration.license.recheckFailed")),
  })
}

/** `describeLicense` in the admin's language, as of this render. */
export function useDescribeLicense(): (entry: LicenseStateEntry) => LicenseView {
  const { i18n } = useTranslation()
  return (entry) => {
    const now = Date.now()
    return describeLicense(entry, { now, format: licenseFormat(i18n.language, now) })
  }
}

/**
 * The second line of a license, in words: the hint, or where the license was confirmed and when,
 * as in "My Shop · production · checked 2 hr. ago". `withChecked` adds the time after a hint too.
 */
export function useLicenseDetails(): (view: LicenseView, options?: { withChecked?: boolean }) => string {
  const { t } = useTranslation()
  return (view, { withChecked = false } = {}) => {
    const checked = view.checked ? t("integration.license.checked", { when: view.checked }) : undefined
    const parts = view.hint
      ? [t(view.hint.key, view.hint.values), withChecked ? checked : undefined]
      : [
          view.context?.project,
          view.context?.environment === null ? t("integration.license.local") : view.context?.environment,
          checked,
        ]
    return parts.filter(Boolean).join(" · ")
  }
}
