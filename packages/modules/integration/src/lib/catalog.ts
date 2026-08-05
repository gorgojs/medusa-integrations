import type { CatalogIntegration } from "../types"
import { FALLBACK_CATALOG } from "./catalog.generated"
import { isSafeHref } from "./markdown/href"
import { MD_MAX_CHARS } from "./markdown/parse"

const CATALOG_API_URL = "https://gorgojs.com/api/integrations"
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour
const FETCH_TIMEOUT_MS = 4000

type CacheEntry = { data: CatalogIntegration[]; at: number }
let cache: CacheEntry | null = null

/** Minimal shape check — enough to reject a malformed API response. */
const isEntry = (x: any): x is CatalogIntegration =>
  !!x &&
  typeof x.integrationId === "string" &&
  typeof x.slug === "string" &&
  typeof x.label === "string"

/**
 * A locale value is usable only as a string within the render-time size cap (`MD_MAX_CHARS`,
 * matched to `catalog/schema.json`'s `localizedMarkdown.maxLength`). Checking this here — not
 * just inside `parseMarkdown` — matters because an oversized snippet would otherwise still be
 * fetched, JSON-parsed, cached for up to an hour, and re-served through the merchant's own
 * `/admin/integrations/catalog` response before the render-time cap ever applies.
 */
const usableLocale = (v: unknown): v is string => typeof v === "string" && v.length <= MD_MAX_CHARS

/**
 * Rebuild docsSnippet from only its usable locales — dropping just the oversized/malformed
 * locale rather than the whole field, since a single-locale snippet is still worth showing.
 * Returns undefined when no locale survives.
 */
const sanitizeSnippet = (x: unknown): CatalogIntegration["docsSnippet"] => {
  if (!x || typeof x !== "object" || Array.isArray(x)) return undefined
  const { en, ru } = x as { en?: unknown; ru?: unknown }
  const snippet: { en?: string; ru?: string } = {}
  if (usableLocale(en)) snippet.en = en
  if (usableLocale(ru)) snippet.ru = ru
  return snippet.en || snippet.ru ? snippet : undefined
}

/**
 * Drop malformed/unsafe fields rather than rejecting the whole entry: both are optional, so a
 * bad one costs the drawer its guide or its docs link, not the merchant the integration.
 */
const sanitizeEntry = (entry: CatalogIntegration): CatalogIntegration => {
  const result = { ...entry }

  if (result.docsSnippet !== undefined) {
    const snippet = sanitizeSnippet(result.docsSnippet)
    if (snippet) result.docsSnippet = snippet
    else delete result.docsSnippet
  }

  if (result.docsUrl !== undefined && !isSafeHref(result.docsUrl)) {
    delete result.docsUrl
  }

  return result
}

/** Fetch the remote catalog with a hard timeout. Throws on any failure/invalid shape. */
async function fetchRemoteCatalog(): Promise<CatalogIntegration[]> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(CATALOG_API_URL, { signal: controller.signal })
    if (!res.ok) throw new Error(`catalog api responded ${res.status}`)
    const body = (await res.json()) as { integrations?: unknown }
    const list = body?.integrations
    if (!Array.isArray(list) || !list.every(isEntry)) {
      throw new Error("catalog api returned an unexpected shape")
    }
    return (list as CatalogIntegration[]).map(sanitizeEntry)
  } finally {
    clearTimeout(timer)
  }
}

/**
 * The Gorgo integration catalog: the live API when reachable (cached ~1h), otherwise the
 * last-good response, otherwise the yml-derived FALLBACK_CATALOG shipped with the plugin.
 * Never throws.
 */
export async function loadCatalog(): Promise<CatalogIntegration[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.data
  try {
    const data = await fetchRemoteCatalog()
    cache = { data, at: Date.now() }
    return data
  } catch {
    return cache?.data ?? FALLBACK_CATALOG
  }
}

/** Test-only: clear the in-memory cache between cases. */
export function resetCatalogCacheForTests(): void {
  cache = null
}
