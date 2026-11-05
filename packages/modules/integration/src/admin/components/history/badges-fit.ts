/**
 * How many badges of `widths` fit into `width` on one line, `gap` apart, keeping room for the
 * "+N" badge, `more` wide, when some are left out. At least one: the last one shown is cut with an
 * ellipsis when even it does not fit.
 */
export function badgesThatFit(widths: number[], more: number, width: number, gap: number): number {
  let used = 0
  let shown = 0
  for (; shown < widths.length; shown++) {
    const next = used + (shown ? gap : 0) + widths[shown]
    const tail = shown + 1 < widths.length ? gap + more : 0
    if (next + tail > width) break
    used = next
  }
  return Math.max(1, shown)
}
