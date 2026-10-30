import type { AdminIntegrationChange } from "../../../types"

export type ChangeTitle = { key: string; values?: Record<string, string> }

const key = (name: string) => `integration.history.events.${name}`

/**
 * The i18n key of a change's headline. `section` is the translated title of the edited section,
 * or null when the change has none or the section no longer exists in the descriptor.
 */
export function changeTitle(
  change: Pick<AdminIntegrationChange, "change_type" | "outcome">,
  section: string | null = null
): ChangeTitle {
  switch (change.change_type) {
    case "created":
    case "enabled":
    case "disabled":
    case "deleted":
      return { key: key(change.change_type) }
    case "updated":
      return section ? { key: key("updatedSection"), values: { section } } : { key: key("updated") }
    case "connection_tested":
      return { key: key(change.outcome === "succeeded" ? "testPassed" : "testFailed") }
    default:
      // A change type a newer version of the module wrote.
      return { key: key("other") }
  }
}

/** A failed change gets the red dot in the timeline. */
export function isFailedChange(change: Pick<AdminIntegrationChange, "outcome">): boolean {
  return change.outcome === "failed"
}
