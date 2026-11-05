import { keepPreviousData, useQuery, type QueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { sdk } from "./sdk"
import { changeTimeFormat, type ChangeTimeFormat } from "./format-date"
import type {
  AdminIntegrationChangeActorsResponse,
  AdminIntegrationChangeFieldsResponse,
  AdminIntegrationChangeListResponse,
  AdminIntegrationChangeResponse,
} from "../../types"

/** Every change-history query starts with this key, so one invalidation refreshes them all. */
export const CHANGES_QUERY_KEY = ["integration-changes"] as const

export type IntegrationChangesQuery = {
  limit?: number
  offset?: number
  provider_id?: string | string[]
  change_type?: string | string[]
  /** Admin user ids, and `system` for every change shown as System. */
  actor_id?: string[]
  created_at?: Record<string, string>
  /** Free text over the author, the integration and the options changed. */
  q?: string
  /** Ids and label keys of the options whose label contains `q`, see `fieldsMatching`. */
  q_fields?: string[]
  /** A column, `-` in front for descending. The API defaults to `-created_at`. */
  order?: string
}

/** The change history of one integration, or of all of them when `providerId` is omitted. */
export function useIntegrationChanges(providerId: string | null, query: IntegrationChangesQuery = {}) {
  return useQuery({
    queryKey: [...CHANGES_QUERY_KEY, providerId ?? "all", query],
    queryFn: () =>
      sdk.client.fetch<AdminIntegrationChangeListResponse>(
        providerId ? `/admin/integrations/${providerId}/changes` : "/admin/integrations/changes",
        { query }
      ),
    placeholderData: keepPreviousData,
  })
}

/** Every option the history names, for the search: the API matches no translated labels itself. */
export function useChangeFields() {
  return useQuery({
    queryKey: [...CHANGES_QUERY_KEY, "fields"],
    queryFn: () => sdk.client.fetch<AdminIntegrationChangeFieldsResponse>("/admin/integrations/changes/fields"),
    placeholderData: keepPreviousData,
  })
}

/** Who the history names, for the author filter: admin users by label, and whether System made changes. */
export function useChangeActors() {
  return useQuery({
    queryKey: [...CHANGES_QUERY_KEY, "actors"],
    queryFn: () => sdk.client.fetch<AdminIntegrationChangeActorsResponse>("/admin/integrations/changes/actors"),
    placeholderData: keepPreviousData,
  })
}

/** One change with its request details (IP address, client, request id). Not fetched without an id. */
export function useIntegrationChange(id: string | null) {
  return useQuery({
    queryKey: ["integration-change", id],
    queryFn: () => sdk.client.fetch<AdminIntegrationChangeResponse>(`/admin/integrations/changes/${id}`),
    enabled: !!id,
    retry: false,
  })
}

/** Call after anything on the page that can add a change: a save, a toggle, a test, a deletion. */
export function invalidateChanges(qc: QueryClient) {
  return qc.invalidateQueries({ queryKey: CHANGES_QUERY_KEY })
}

/** `changeTimeFormat` in the admin's language, as of this render. */
export function useChangeTimeFormat(): ChangeTimeFormat {
  const { i18n } = useTranslation()
  return changeTimeFormat(i18n.language, Date.now())
}
