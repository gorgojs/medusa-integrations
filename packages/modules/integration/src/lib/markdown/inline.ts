import type { MdInline } from "./types"
import { isSafeHref } from "./href"

/**
 * Alternation order is the grammar's precedence: code wins over everything, so
 * `` `**x**` `` stays literal; `**` is tried before `*` so bold isn't read as two
 * italics. Declared without /g — a fresh copy is made per call so `lastIndex`
 * is never shared between invocations.
 */
const INLINE_RE =
  /`([^`\n]+)`|\[([^\]\n]*)\]\(([^)\s]+)\)|\*\*([^*\n]+)\*\*|\*([^*\n]+)\*|_([^_\n]+)_/

const MAX_DEPTH = 3

export function parseInline(src: string, depth = 0): MdInline[] {
  if (!src) return []
  if (depth >= MAX_DEPTH) return [{ type: "text", value: src }]

  const out: MdInline[] = []
  const re = new RegExp(INLINE_RE, "g")
  let last = 0
  let m: RegExpExecArray | null

  while ((m = re.exec(src)) !== null) {
    const [full, code, linkText, linkHref, strong, star, underscore] = m
    if (m.index > last) out.push({ type: "text", value: src.slice(last, m.index) })
    last = m.index + full.length

    if (code !== undefined) {
      out.push({ type: "code", value: code })
    } else if (linkHref !== undefined) {
      // `![x](y)` is an image — not in the grammar, so keep it literal.
      const isImage = m.index > 0 && src[m.index - 1] === "!"
      if (!isImage && isSafeHref(linkHref)) {
        out.push({ type: "link", href: linkHref, children: parseInline(linkText, depth + 1) })
      } else {
        out.push({ type: "text", value: full })
      }
    } else if (strong !== undefined) {
      out.push({ type: "strong", children: parseInline(strong, depth + 1) })
    } else {
      out.push({ type: "em", children: parseInline((star ?? underscore)!, depth + 1) })
    }
  }

  if (last < src.length) out.push({ type: "text", value: src.slice(last) })
  return out
}
