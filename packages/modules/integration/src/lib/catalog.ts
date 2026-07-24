import type { CatalogIntegration } from "../types"
import { FALLBACK_CATALOG } from "./catalog.generated"

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
    return list as CatalogIntegration[]
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
