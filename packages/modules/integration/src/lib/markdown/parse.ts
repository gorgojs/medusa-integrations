import type { MdBlock, MdInline } from "./types"
import { parseInline } from "./inline"

/** Matches `maxLength` on catalog/schema.json's localizedMarkdown. Keep in sync. */
export const MD_MAX_CHARS = 8000
/** A list block renders one node per item, so items count individually toward this cap. */
export const MD_MAX_BLOCKS = 200

const FENCE_RE = /^```(.*)$/
const HEADING_RE = /^(#{1,3})\s+(.*)$/
const HR_RE = /^-{3,}\s*$/
const UL_RE = /^[-*]\s+(.*)$/
const OL_RE = /^\d+\.\s+(.*)$/

/**
 * The fence info string becomes the block's caption. Only the first token is
 * kept and it is filtered to a charset, so attribute-looking info strings
 * (`ts title="x" onload=y`) collapse to `ts` instead of being parsed.
 */
export function fenceLabel(info: string): string | null {
  const first = info.trim().split(/\s+/)[0] ?? ""
  return first.replace(/[^a-zA-Z0-9._/-]/g, "").slice(0, 40) || null
}

export function parseMarkdown(src: string): MdBlock[] {
  if (typeof src !== "string" || !src) return []
  if (src.length > MD_MAX_CHARS) return [{ type: "truncated" }]

  const lines = src.replace(/\r\n?/g, "\n").split("\n")
  const blocks: MdBlock[] = []
  let para: string[] = []

  const flushPara = () => {
    if (!para.length) return
    blocks.push({ type: "paragraph", children: parseInline(para.join(" ")) })
    para = []
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    const fence = FENCE_RE.exec(line)
    if (fence) {
      flushPara()
      const body: string[] = []
      i++
      while (i < lines.length && !FENCE_RE.test(lines[i])) body.push(lines[i++])
      blocks.push({ type: "codeBlock", label: fenceLabel(fence[1]), value: body.join("\n") })
      continue
    }

    if (!line.trim()) {
      flushPara()
      continue
    }

    // Before UL: `---` is a rule, and UL_RE would not match it anyway.
    if (HR_RE.test(line)) {
      flushPara()
      blocks.push({ type: "hr" })
      continue
    }

    const heading = HEADING_RE.exec(line)
    if (heading) {
      flushPara()
      blocks.push({
        type: "heading",
        level: (heading[1].length + 1) as 2 | 3 | 4,
        children: parseInline(heading[2]),
      })
      continue
    }

    const ul = UL_RE.exec(line)
    const ol = ul ? null : OL_RE.exec(line)
    if (ul || ol) {
      flushPara()
      const ordered = !!ol
      const itemRe = ordered ? OL_RE : UL_RE
      const items: MdInline[][] = []
      while (i < lines.length) {
        const item = itemRe.exec(lines[i])
        if (!item) break
        items.push(parseInline(item[1]))
        i++
      }
      i-- // the for-loop's i++ consumes the non-item line
      blocks.push({ type: "list", ordered, items })
      continue
    }

    para.push(line)
  }
  flushPara()

  // A list is one block but renders one node per item, so items count individually —
  // otherwise a single all-items snippet slips ~2600 nodes past a 200-block cap.
  const weight = blocks.reduce((n, b) => n + (b.type === "list" ? b.items.length : 1), 0)
  return weight > MD_MAX_BLOCKS ? [{ type: "truncated" }] : blocks
}
