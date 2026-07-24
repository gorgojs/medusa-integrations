/**
 * Decide which option ids a write actually persists, given the ids the request is scoped to,
 * the submitted `values`, and which ids are secrets.
 * `writeIds` are exactly the ids to validate + persist; `submitted` are their values.
 * Everything not in `writeIds` is left untouched.
 */
export function selectWritableValues(
  scopeIds: readonly string[],
  values: Record<string, unknown>,
  secretKeys: ReadonlySet<string>
): { writeIds: string[]; submitted: Record<string, unknown> } {
  const writeIds: string[] = []
  const submitted: Record<string, unknown> = {}
  for (const id of scopeIds) {
    if (!Object.prototype.hasOwnProperty.call(values, id)) continue
    const v = values[id]
    if (secretKeys.has(id) && (v == null || v === "")) continue
    writeIds.push(id)
    submitted[id] = v
  }
  return { writeIds, submitted }
}
