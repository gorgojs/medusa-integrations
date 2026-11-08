import type { IntegrationOverviewItem } from "../../types"

/**
 * Whether the search finds an integration in the list: in its name or description as the admin
 * shows them, or in its identifier or instance. The descriptor holds translation keys, which the
 * server cannot translate, so the list is searched here.
 */
export function integrationMatches(
  item: IntegrationOverviewItem,
  q: string,
  translate: (key: string) => string
): boolean {
  const needle = q.trim().toLocaleLowerCase()
  if (!needle) return true
  return [
    translate(item.display_name),
    item.description ? translate(item.description) : null,
    item.identifier,
    item.instance_id,
  ].some((text) => !!text && text.toLocaleLowerCase().includes(needle))
}
