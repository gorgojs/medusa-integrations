// Form logic of Medusa's MetadataForm, which @medusajs/dashboard does not export.

export type MetadataRow = {
  key: string
  value: unknown
  /** An object, an array or `null`: shown but not editable, and sent back as it is. */
  disabled?: boolean
}

export type Metadata = Record<string, unknown> | null | undefined

const EDITABLE_TYPES = ["string", "number", "boolean"]

const isEditable = (value: unknown) => EDITABLE_TYPES.includes(typeof value)

/** One row per key, with a single blank row for empty metadata. Numbers and booleans become text. */
export function metadataRows(metadata: Metadata): MetadataRow[] {
  if (!metadata || !Object.keys(metadata).length) return [{ key: "", value: "", disabled: false }]
  return Object.entries(metadata).map(([key, value]) => {
    if (!isEditable(value)) return { key, value, disabled: true }
    return { key, value: typeof value === "string" ? value : JSON.stringify(value) }
  })
}

/** Whether some key holds an object, an array or `null`, which the form cannot edit. */
export function hasUneditableRows(metadata: Metadata): boolean {
  return !!metadata && Object.values(metadata).some((value) => !isEditable(value))
}

/**
 * Builds the `metadata` to send. A removed key is sent as "" so the API deletes it.
 * An empty form sends null, which clears all metadata.
 */
export function parseMetadataRows(rows: MetadataRow[], original: Metadata): Record<string, unknown> | null {
  const isEmpty = !rows.length || (rows.length === 1 && !rows[0].key && !rows[0].value)
  if (isEmpty) return null

  const update: Record<string, unknown> = {}
  if (original) {
    for (const originalKey of Object.keys(original)) {
      if (!rows.some((row) => row.key === originalKey)) update[originalKey] = ""
    }
  }

  for (const row of rows) {
    if (!row.key) continue
    if (row.disabled) {
      update[row.key] = row.value
      continue
    }
    const key = row.key.trim()
    const value = typeof row.value === "string" ? row.value.trim() : ""
    if (value === "true") update[key] = true
    else if (value === "false") update[key] = false
    else if (/^-?\d*\.?\d+$/.test(value)) update[key] = parseFloat(value)
    else update[key] = value
  }
  return update
}
