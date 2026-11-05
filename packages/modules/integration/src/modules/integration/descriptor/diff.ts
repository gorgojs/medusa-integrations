import type { IntegrationDescriptor } from "./define"
import type { DiffEntry } from "../../../types/integration/history"

/** Longest stored value (a string, or a structured value's JSON). Longer ones are cut and marked. */
export const DIFF_MAX_VALUE_LENGTH = 512
/** Most entries one change keeps. */
export const DIFF_MAX_FIELDS = 100
/** Budget for the whole entry list's JSON. Entries past it keep their field but lose their values. */
export const DIFF_MAX_BYTES = 16 * 1024

const isSet = (v: unknown) => v !== undefined && v !== null && v !== ""

/** JSON with object keys sorted at every depth, so equal configs compare equal whatever their key order. */
function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_key, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, v[k]]))
      : v
  )
}

function sameValue(a: unknown, b: unknown): boolean {
  return stableStringify(a ?? null) === stableStringify(b ?? null)
}

function clip(value: unknown): { value: unknown; truncated: boolean } {
  if (value === undefined) return { value: null, truncated: false }
  if (typeof value === "string") {
    return value.length > DIFF_MAX_VALUE_LENGTH
      ? { value: value.slice(0, DIFF_MAX_VALUE_LENGTH), truncated: true }
      : { value, truncated: false }
  }
  if (value !== null && typeof value === "object") {
    const json = JSON.stringify(value)
    return json.length > DIFF_MAX_VALUE_LENGTH
      ? { value: json.slice(0, DIFF_MAX_VALUE_LENGTH), truncated: true }
      : { value, truncated: false }
  }
  return { value, truncated: false }
}

/**
 * The options that differ between two decrypted configs, in the descriptor's order. A secret
 * option yields only what happened to it (`set`, `replaced`, `removed`), never a value. A plain
 * option yields its values before and after. Undeclared keys are ignored: without a declaration
 * there is no way to tell whether they are secret.
 */
export function diffOptions(
  descriptor: Pick<IntegrationDescriptor, "options">,
  before: Record<string, unknown>,
  after: Record<string, unknown>
): DiffEntry[] {
  const entries: DiffEntry[] = []
  let bytes = 2

  for (const [field, def] of Object.entries(descriptor.options)) {
    if (entries.length >= DIFF_MAX_FIELDS) break
    const from = before[field]
    const to = after[field]

    let entry: DiffEntry
    if (def.secret === true) {
      if (!isSet(from) && !isSet(to)) continue
      if (isSet(from) && isSet(to) && from === to) continue
      const op = !isSet(from) ? "set" : !isSet(to) ? "removed" : "replaced"
      entry = { field, label: def.label, secret: true, op }
    } else {
      if (sameValue(from, to)) continue
      const a = clip(from)
      const b = clip(to)
      entry = { field, label: def.label, from: a.value, to: b.value }
      if (a.truncated || b.truncated) entry.truncated = true
      if (bytes + JSON.stringify(entry).length + 1 > DIFF_MAX_BYTES) {
        entry = { field, label: def.label, from: null, to: null, truncated: true }
      }
    }

    const size = JSON.stringify(entry).length + 1
    if (bytes + size > DIFF_MAX_BYTES) break
    bytes += size
    entries.push(entry)
  }

  return entries
}

/** The option ids and label keys of a change, each once: what the search finds a change by its options with. */
export function diffFields(diff: DiffEntry[]): string[] {
  return [...new Set(diff.flatMap((entry) => (entry.label ? [entry.field, entry.label] : [entry.field])))]
}
