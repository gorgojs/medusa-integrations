export function shallowEqual(
  a: Record<string, unknown> | null | undefined,
  b: Record<string, unknown> | null | undefined
) {
  if (a === b) return true
  if (!a || !b) return false

  const keys = Object.keys(a)
  if (keys.length !== Object.keys(b).length) return false

  return keys.every((key) => Object.is(a[key], b[key]))
}
