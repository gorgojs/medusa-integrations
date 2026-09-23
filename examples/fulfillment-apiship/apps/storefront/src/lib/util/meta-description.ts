const MAX_LENGTH = 160

export function metaDescription(
  ...candidates: (string | null | undefined)[]
): string | undefined {
  for (const candidate of candidates) {
    const text = candidate
      ?.replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim()

    if (!text) continue
    if (text.length <= MAX_LENGTH) return text

    const clipped = text.slice(0, MAX_LENGTH - 1)
    const lastSpace = clipped.lastIndexOf(" ")
    const cut = lastSpace > 0 ? clipped.slice(0, lastSpace) : clipped

    return `${cut.replace(/[\s.,;:!?–—-]+$/, "")}…`
  }

  return undefined
}
