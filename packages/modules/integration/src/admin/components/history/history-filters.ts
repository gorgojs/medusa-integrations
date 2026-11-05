import type { IntegrationChangesQuery } from "../../lib/changes"
import type { IntegrationChangeField } from "../../../types"

export const HISTORY_PAGE_SIZE = 20

export const CHANGE_TYPES = ["created", "updated", "enabled", "disabled", "deleted"] as const

/** The author filter's value for every change the table shows as System. The API takes it in `actor_id`. */
export const SYSTEM_ACTOR = "system"

/** Columns the history page sorts by. The API sorts by any of them; newest first by default. */
export const SORTABLE_COLUMNS = ["created_at", "provider_id", "change_type", "actor_label"] as const
const DEFAULT_SORTING = { id: "created_at", desc: true }

/** The filters, the search and the sorting of the history page. They live in the URL, so a link or a reload keeps them. */
export type HistoryFilters = {
  provider_id: string[]
  change_type: string[]
  /** Admin user ids, and `SYSTEM_ACTOR`. */
  actor_id: string[]
  created_at: { $gte?: string; $lte?: string } | null
  /** Free text over the author, the integration and the options changed, as typed. Trimmed when sent. */
  q: string
  /** A column from `SORTABLE_COLUMNS`, `-` in front for descending. Empty for newest first. */
  order: string
}

const validDate = (value: string | null) => (value && !Number.isNaN(Date.parse(value)) ? value : undefined)

const validOrder = (value: string | null) =>
  value && (SORTABLE_COLUMNS as readonly string[]).includes(value.replace(/^-/, "")) ? value : ""

export function readFilters(params: URLSearchParams): HistoryFilters {
  const $gte = validDate(params.get("from"))
  const $lte = validDate(params.get("to"))
  return {
    provider_id: params.getAll("provider_id").filter(Boolean),
    change_type: params.getAll("change_type").filter((v) => (CHANGE_TYPES as readonly string[]).includes(v)),
    actor_id: params.getAll("actor_id").filter(Boolean),
    created_at: $gte || $lte ? { ...($gte && { $gte }), ...($lte && { $lte }) } : null,
    q: params.get("q") ?? "",
    order: validOrder(params.get("order")),
  }
}

/** The offset in the URL, or 0 when it is missing or not a number. */
export function readOffset(params: URLSearchParams): number {
  const offset = Number(params.get("offset"))
  return Number.isInteger(offset) && offset > 0 ? offset : 0
}

/** Replaces the filters and the offset in `params`, keeping the rest (the open change card). */
export function writeFilters(params: URLSearchParams, filters: HistoryFilters, offset = 0): URLSearchParams {
  const next = new URLSearchParams(params)
  for (const key of ["provider_id", "change_type", "actor_id", "from", "to", "q", "order", "offset"]) next.delete(key)
  for (const id of filters.provider_id) next.append("provider_id", id)
  for (const type of filters.change_type) next.append("change_type", type)
  for (const id of filters.actor_id) next.append("actor_id", id)
  if (filters.created_at?.$gte) next.set("from", filters.created_at.$gte)
  if (filters.created_at?.$lte) next.set("to", filters.created_at.$lte)
  if (filters.q) next.set("q", filters.q)
  if (filters.order) next.set("order", filters.order)
  if (offset > 0) next.set("offset", String(offset))
  return next
}

/**
 * The API query for the filters. The end of the period is the end of that day. `qFields` are the
 * options the search matched, from `fieldsMatching`; they go only with the search.
 */
export function buildChangesQuery(
  filters: HistoryFilters,
  offset: number,
  qFields: string[] = []
): IntegrationChangesQuery {
  const query: IntegrationChangesQuery = { limit: HISTORY_PAGE_SIZE, offset }
  if (filters.provider_id.length) query.provider_id = filters.provider_id
  if (filters.change_type.length) query.change_type = filters.change_type
  if (filters.actor_id.length) query.actor_id = filters.actor_id
  if (filters.created_at) {
    const { $gte, $lte } = filters.created_at
    query.created_at = {
      ...($gte && { $gte }),
      // The date picker gives midnight, which would leave out the day picked as the end.
      ...($lte && { $lte: endOfDay($lte) }),
    }
  }
  const q = filters.q.trim()
  if (q) query.q = q
  if (q && qFields.length) query.q_fields = qFields
  if (filters.order) query.order = filters.order
  return query
}

/**
 * The options whose label, as the table shows it, or id contains the search. Each is sent by its
 * label key, or by its id when it was stored without one: the database has no translated labels,
 * so the search over options is matched here and the API looks only for these keys.
 */
export function fieldsMatching(
  q: string,
  fields: IntegrationChangeField[],
  labelOf: (field: IntegrationChangeField) => string
): string[] {
  const needle = q.trim().toLocaleLowerCase()
  if (!needle) return []
  const matched = fields.filter(
    (field) =>
      labelOf(field).toLocaleLowerCase().includes(needle) || field.field.toLocaleLowerCase().includes(needle)
  )
  return [...new Set(matched.map((field) => field.label ?? field.field))]
}

function endOfDay(iso: string): string {
  const date = new Date(iso)
  date.setHours(23, 59, 59, 999)
  return date.toISOString()
}

/** Whether anything narrows the list. The sorting does not. */
export function hasFilters(filters: HistoryFilters): boolean {
  return !!(
    filters.provider_id.length ||
    filters.change_type.length ||
    filters.actor_id.length ||
    filters.created_at ||
    filters.q.trim()
  )
}

/** The table's sorting for the `order` in the URL. */
export function sortingFromOrder(order: string): { id: string; desc: boolean } {
  return order ? { id: order.replace(/^-/, ""), desc: order.startsWith("-") } : DEFAULT_SORTING
}

/** The `order` for the table's sorting. Empty for the default, so the URL stays short. */
export function orderFromSorting(sorting: { id: string; desc: boolean } | null | undefined): string {
  if (!sorting || (sorting.id === DEFAULT_SORTING.id && sorting.desc === DEFAULT_SORTING.desc)) return ""
  return validOrder(`${sorting.desc ? "-" : ""}${sorting.id}`)
}

/** A filter the table holds without a value yet: picked from the menu, its value picker still open. */
export function isEmptyFilterValue(value: unknown): boolean {
  if (value == null || value === "") return true
  if (Array.isArray(value)) return value.length === 0
  if (typeof value === "object") return Object.values(value as object).every((v) => v == null || v === "")
  return false
}

/** The table's filter state as page filters. Filters without a value count as absent. */
export function filtersFromState(
  state: Record<string, unknown>
): Pick<HistoryFilters, "provider_id" | "change_type" | "actor_id" | "created_at"> {
  const list = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [])
  const range = state.created_at as { $gte?: string; $lte?: string } | null | undefined
  return {
    provider_id: list(state.provider_id),
    change_type: list(state.change_type),
    actor_id: list(state.actor_id),
    created_at: range && !isEmptyFilterValue(range) ? range : null,
  }
}

/** The filters without a value, which the URL cannot hold but the table needs while one is being picked. */
export function emptyFilters(state: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(state).filter(([, value]) => isEmptyFilterValue(value)))
}
