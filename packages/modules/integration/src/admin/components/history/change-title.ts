import type { AdminIntegrationChange } from "../../../types"

export type ChangeTitle = { key: string; values?: { count: number } }

const key = (name: string) => `integration.history.events.${name}`

/**
 * The i18n key of a change's headline. A save and a deletion say how many options they touched,
 * whichever sections those belong to (an API call can touch several); the badges under it name
 * them. `count` picks the plural form.
 */
export function changeTitle(change: Pick<AdminIntegrationChange, "change_type" | "diff">): ChangeTitle {
  const count = change.diff?.length ?? 0
  switch (change.change_type) {
    case "created":
      return count ? { key: key("fieldsSet"), values: { count } } : { key: key("other") }
    case "updated":
      return count ? { key: key("fieldsChanged"), values: { count } } : { key: key("other") }
    case "deleted":
      return count ? { key: key("fieldsDeleted"), values: { count } } : { key: key("deleted") }
    case "enabled":
    case "disabled":
      return { key: key(change.change_type) }
    default:
      // A change type a newer version of the module wrote.
      return { key: key("other") }
  }
}
