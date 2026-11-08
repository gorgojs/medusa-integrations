import { useQuery } from "@tanstack/react-query"
import { sdk } from "./sdk"
import type { AdminIntegrationListResponse } from "../../types"

/**
 * Every registered integration. The list is short, and its names and descriptions are translated
 * only here, so the pages load it whole and search it themselves, see `integrationMatches`.
 */
export function useIntegrationOverview() {
  return useQuery({
    queryKey: ["integration-overview"],
    queryFn: () =>
      sdk.client.fetch<AdminIntegrationListResponse>("/admin/integrations", { query: { limit: 1000 } }),
  })
}
