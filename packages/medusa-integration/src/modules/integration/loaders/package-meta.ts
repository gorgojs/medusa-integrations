import type { PackageMeta } from "../types"

type RawPkg = {
  name?: string
  version?: string
  author?: string | { name?: string; url?: string }
  homepage?: string
}

/** Capitalize the first character ("gorgo" → "Gorgo"). */
const cap = (s: string): string => (s ? s[0].toUpperCase() + s.slice(1) : s)

/** Narrow to string, else undefined — guards against non-string JSON-valid shapes. */
const str = (v: unknown): string | undefined => (typeof v === "string" ? v : undefined)

/**
 * Derive a human author name from an npm scope: "@gorgo/medusa-payment-tkassa" → "Gorgo".
 * Returns null for unscoped/blank names.
 */
export function authorFromScope(name: string | null | undefined): string | null {
  if (!name) return null
  const m = /^@([^/]+)\//.exec(name)
  return m ? cap(m[1]) : null
}

/**
 * Normalize a raw package.json into the fields the admin list needs. `author` may be a string
 * ("Name <email> (url)") or an object ({ name, url }); when absent, the name is derived from the
 * npm scope. `authorUrl` comes from the author's url, else `homepage`.
 */
export function parsePackageMeta(pkg: RawPkg): PackageMeta {
  const name = str(pkg.name) ?? null
  const version = str(pkg.version) ?? null

  let author: string | null = null
  let authorUrl: string | null = null

  if (typeof pkg.author === "string") {
    author = pkg.author.split(/[<(]/)[0].trim() || null
    const url = /\(([^)]+)\)/.exec(pkg.author)?.[1]
    if (url) authorUrl = url.trim()
  } else if (pkg.author && typeof pkg.author === "object") {
    author = str(pkg.author.name)?.trim() || null
    authorUrl = str(pkg.author.url)?.trim() || null
  }

  if (!author) author = authorFromScope(name)
  if (!authorUrl) authorUrl = str(pkg.homepage)?.trim() || null

  return { name, version, author, authorUrl }
}
