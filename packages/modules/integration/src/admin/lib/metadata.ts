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
 * Builds the `metadata` patch to send: changed keys with their values, removed keys as "".
 * Untouched keys are left out, so a value a plugin wrote while the form was open stays.
 */
export function parseMetadataRows(rows: MetadataRow[], original: Metadata): Record<string, unknown> {
  const before = original ?? {}
  const kept = new Set<string>()
  const update: Record<string, unknown> = {}

  for (const row of rows) {
    if (row.disabled) {
      if (row.key) kept.add(row.key)
      continue
    }
    const key = row.key.trim()
    if (!key) continue
    kept.add(key)
    const value = typeof row.value === "string" ? row.value.trim() : ""
    if (key in before && isEditable(before[key]) && value === String(before[key])) continue
    if (value === "true") update[key] = true
    else if (value === "false") update[key] = false
    else if (/^-?\d*\.?\d+$/.test(value)) update[key] = parseFloat(value)
    else update[key] = value
  }

  for (const key of Object.keys(before)) {
    if (!kept.has(key)) update[key] = ""
  }
  return update
}
