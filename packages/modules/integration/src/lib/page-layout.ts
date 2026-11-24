// Shared by the admin page and the Admin API so the names stay in sync.

/** Widget zone of a provider's page. Medusa also saves the page layout under this name. */
export const integrationWidgetZone = (identifier: string) => `gorgo.integration.${identifier}`

export const METADATA_SECTION_ENTRY = "MetadataSection"
export const JSON_VIEW_SECTION_ENTRY = "JsonViewSection"

/** Medusa puts widgets after the page's own sections. This layout moves Metadata and JSON below them. */
export const DEFAULT_INTEGRATION_LAYOUT = {
  widgets: {
    [`core:${METADATA_SECTION_ENTRY}`]: { order: 1000 },
    [`core:${JSON_VIEW_SECTION_ENTRY}`]: { order: 1001 },
  },
}
