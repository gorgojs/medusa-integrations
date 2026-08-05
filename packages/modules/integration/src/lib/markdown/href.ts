/**
 * Only absolute https URLs are renderable as links.
 *
 * Uses the URL parser rather than a regex on purpose: it normalises away the
 * tricks a regex misses — leading whitespace, embedded tabs/newlines inside the
 * scheme (`java\nscript:`), and uppercase schemes — before the protocol is read.
 * A protocol-relative `//host` has no scheme and throws, which is what we want.
 */
export function isSafeHref(raw: string): boolean {
  try {
    return new URL(raw).protocol === "https:"
  } catch {
    return false
  }
}
