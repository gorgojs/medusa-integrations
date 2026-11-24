"use server"

import { fetchWithoutLocale } from "@lib/config"
import type { HttpTypes } from "@medusajs/types"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

/**
 * The product index the backend declares in `src/search/product.ts`. It holds
 * IDs, never labels, so the storefront filters and sorts on it and then loads
 * the products it shows through the Store API, priced for the region and
 * translated for the locale.
 */
const PRODUCT_INDEX = "product"

export type CatalogSearchInput = {
  /** Free text, matched against every language the catalog is translated into. */
  q?: string
  categoryIds?: string[]
  collectionId?: string
  /**
   * Selected option values, grouped by the option they belong to. A product
   * matches when it has one of the values of every group: "Black or White,
   * and M".
   */
  optionValueGroups?: string[][]
  sortBy?: SortOptions
  /** The region's currency, which price sorting reads its prices in. */
  currencyCode?: string
  skip?: number
  take: number
}

export type CatalogSearchResult = {
  ids: string[]
  count: number
}

/**
 * Scripts written without spaces between words. Full-text search splits text
 * into words at spaces, so a query in one of them is matched as a substring
 * of the `substring_text` field instead.
 */
const UNSPACED_SCRIPT = new RegExp(
  [
    "[\u3400-\u4DBF\u4E00-\u9FFF\uF900-\uFAFF]", // Han
    "[\u3040-\u30FF\u31F0-\u31FF\uFF66-\uFF9F]", // Hiragana, Katakana
    "[\u0E00-\u0EFF]", // Thai, Lao
    "[\u1000-\u109F\u1780-\u17FF]", // Myanmar, Khmer
  ].join("|")
)

const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&")

type SearchFilters = NonNullable<HttpTypes.StoreSearchQuery["filters"]>

const sortOrder = (
  input: CatalogSearchInput,
  matchesText: boolean
): Record<string, "ASC" | "DESC"> | undefined => {
  const currency = input.currencyCode?.toLowerCase()

  // `id` breaks ties, so equal prices or creation times keep one order from
  // page to page instead of repeating or skipping products.
  if (input.sortBy === "price_asc" && currency) {
    return { [`min_price_${currency}`]: "ASC", id: "ASC" }
  }
  if (input.sortBy === "price_desc" && currency) {
    return { [`min_price_${currency}`]: "DESC", id: "ASC" }
  }
  // A text query sorts by relevance unless asked otherwise.
  if (matchesText && !input.sortBy) {
    return undefined
  }
  return { created_at: "DESC", id: "ASC" }
}

/**
 * Finds the products for a listing or a search in the backend's product index.
 *
 * Returns `null` when the index cannot answer: a backend older than Medusa
 * 2.21.1, one without the index definition, or a database the search
 * extensions could not be installed on. Callers fall back to the Store API.
 */
export async function searchCatalog(
  input: CatalogSearchInput
): Promise<CatalogSearchResult | null> {
  const q = input.q?.trim()
  // A spaced language goes to full-text search through `q`, which has to sit at
  // the top level of the filters, where the module lifts it out.
  const fullText = q && !UNSPACED_SCRIPT.test(q) ? q : undefined
  const conditions: SearchFilters[] = []

  if (q && !fullText) {
    conditions.push({
      substring_text: { $like: `%${escapeLike(q.toLowerCase())}%` },
    })
  }
  if (input.categoryIds?.length) {
    conditions.push({ category_ids: { $overlaps: input.categoryIds } })
  }
  if (input.collectionId) {
    conditions.push({ collection_id: input.collectionId })
  }
  for (const group of input.optionValueGroups ?? []) {
    if (group.length) {
      conditions.push({ option_value_ids: { $overlaps: group } })
    }
  }

  const filters: SearchFilters = {
    ...(fullText ? { q: fullText } : {}),
    ...(conditions.length ? { $and: conditions } : {}),
  }
  const matchesText = Boolean(q)

  const body: HttpTypes.StoreSearchQuery = {
    entity: PRODUCT_INDEX,
    fields: ["id"],
    filters,
    pagination: {
      skip: input.skip ?? 0,
      take: input.take,
      order: sortOrder(input, matchesText),
    },
    search_options: {
      // Every typed word must match, and the last one may be unfinished.
      match_strategy: "last",
      // Off on purpose: the index holds 36 languages, and a fuzzy match
      // against all of them finds something similar to almost any word.
      typo_tolerance: false,
      count: "exact",
    },
  }

  try {
    const { results } = await fetchWithoutLocale<HttpTypes.StoreSearchResponse>(
      "/store/search",
      {
        method: "POST",
        body,
        // The index updates on its own schedule, after the catalog cache has
        // already been revalidated, so its answer is never cached.
        cache: "no-store",
      }
    )
    const result = results?.[0]

    if (!result) {
      return null
    }

    return {
      ids: result.hits.map((hit) => hit.id),
      count: result.metadata.count ?? result.hits.length,
    }
  } catch (error) {
    console.error("[searchCatalog] The product index did not answer", error)
    return null
  }
}
