"use server"

import { sdk } from "@lib/config"
import type { OptionValueIds } from "@lib/util/product-option-filters"
import { sortProducts } from "@lib/util/sort-products"
import {
  getOptionValueHex,
  getOptionValueRank,
  sortByRank,
} from "@lib/util/color-option"
import type { HttpTypes } from "@medusajs/types"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { getAuthHeaders, getCacheOptions, getCountryCode } from "./cookies"
import { getRegion, retrieveRegion } from "./regions"
import { DEFAULT_REGION } from "@lib/util/env"
import { locales } from "@i18n/config"
import { searchCatalog } from "./search"

type ProductListQueryParams = (HttpTypes.FindParams &
  HttpTypes.StoreProductListParams) & {
  options?: string[]
  option_value_id?: string | string[]
}

export const listProducts = async ({
  pageParam = 1,
  queryParams,
  countryCode,
  regionId,
}: {
  pageParam?: number
  queryParams?: ProductListQueryParams
  countryCode?: string
  regionId?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  if (!countryCode && !regionId) {
    throw new Error("Country code or region ID is required")
  }

  const limit = queryParams?.limit || 12
  const _pageParam = Math.max(pageParam, 1)
  const offset = _pageParam === 1 ? 0 : (_pageParam - 1) * limit

  let region: HttpTypes.StoreRegion | undefined | null

  if (countryCode) {
    region = await getRegion(countryCode)
  } else {
    region = await retrieveRegion(regionId!)
  }

  if (!region) {
    return {
      response: { products: [], count: 0 },
      nextPage: null,
    }
  }

  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  return sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[]; count: number }>(
      `/store/products`,
      {
        method: "GET",
        query: {
          limit,
          offset,
          region_id: region?.id,
          fields:
            "*variants.calculated_price,+variants.inventory_quantity,*variants.images,*variants.options,+options.values.metadata,+metadata,+tags,*categories,*categories.parent_category,*categories.parent_category.parent_category",
          ...queryParams,
        },
        headers,
        next,
        cache: "force-cache",
      }
    )
    .then(({ products, count }) => {
      const nextPage = count > offset + limit ? pageParam + 1 : null

      return {
        response: {
          products,
          count,
        },
        nextPage: nextPage,
        queryParams,
      }
    })
}

export type ProductOptionFilterValue = {
  id: string
  label: string
  hex?: string
}

export type ProductOptionFilterGroup = {
  id: string
  title: string
  values: ProductOptionFilterValue[]
}

export const listProductOptionFilters = async (
  queryParams?: Pick<ProductListQueryParams, "category_id" | "collection_id">
): Promise<ProductOptionFilterGroup[]> => {
  const headers = {
    ...(await getAuthHeaders()),
  }

  const next = {
    ...(await getCacheOptions("products")),
  }

  const { products } = await sdk.client
    .fetch<{ products: HttpTypes.StoreProduct[] }>(`/store/products`, {
      method: "GET",
      query: {
        limit: 100,
        fields:
          "id,options.id,options.title,options.values.id,options.values.value,options.values.metadata,variants.options.id,variants.options.option_id",
        ...queryParams,
      },
      headers,
      next,
      cache: "force-cache",
    })
    .catch(() => ({ products: [] as HttpTypes.StoreProduct[] }))

  const groups = new Map<
    string,
    {
      title: string
      values: Map<string, { label: string; hex?: string; rank?: number }>
    }
  >()

  for (const product of products) {
    const usedByOption = new Map<string, Set<string>>()
    for (const variant of product.variants ?? []) {
      for (const optionValue of variant.options ?? []) {
        const optionId = optionValue.option_id
        if (!optionId || optionValue.id == null) continue
        if (!usedByOption.has(optionId)) usedByOption.set(optionId, new Set())
        usedByOption.get(optionId)!.add(optionValue.id)
      }
    }

    for (const option of product.options ?? []) {
      if (!option.id) continue
      const usedValues = usedByOption.get(option.id)
      let group = groups.get(option.id)
      if (!group) {
        group = { title: option.title ?? "", values: new Map() }
        groups.set(option.id, group)
      }
      for (const optionValue of option.values ?? []) {
        if (!optionValue.id || !optionValue.value) continue
        if (usedValues && !usedValues.has(optionValue.id)) continue
        group.values.set(optionValue.id, {
          label: optionValue.value,
          hex: getOptionValueHex(optionValue),
          rank: getOptionValueRank(optionValue),
        })
      }
    }
  }

  return Array.from(groups, ([id, group]) => ({
    id,
    title: group.title,
    values: sortByRank(
      Array.from(group.values, ([valueId, { label, hex, rank }]) => ({
        id: valueId,
        label,
        hex,
        rank,
      }))
    ).map(({ rank: _rank, ...value }) => value),
  }))
}

/**
 * Groups selected option value IDs by the option they belong to, so a listing
 * can ask for "Black or White, and M". Options are global, so one lookup of
 * every option and its values covers every listing. An ID the lookup doesn't
 * know forms a group of its own.
 */
const groupOptionValueIds = async (valueIds: string[]) => {
  if (!valueIds.length) {
    return []
  }

  const next = {
    ...(await getCacheOptions("products")),
  }
  const { product_options } = await sdk.client
    .fetch<{
      product_options: { id: string; values?: { id: string }[] | null }[]
    }>("/store/product-options", {
      method: "GET",
      query: { fields: "id,values.id", limit: 1000 },
      next,
      cache: "force-cache",
    })
    .catch(() => ({ product_options: [] }))
  const optionOf = new Map(
    product_options.flatMap((option) =>
      (option.values ?? []).map((value) => [value.id, option.id])
    )
  )
  const grouped = new Map<string, string[]>()

  for (const valueId of valueIds) {
    const optionId = optionOf.get(valueId) ?? valueId
    grouped.set(optionId, [...(grouped.get(optionId) ?? []), valueId])
  }

  return Array.from(grouped.values())
}

/**
 * The products of the given IDs, priced for the country's region, in the order
 * the IDs come in.
 */
const listProductsInOrder = async (ids: string[], countryCode: string) => {
  if (!ids.length) {
    return []
  }

  const {
    response: { products },
  } = await listProducts({
    queryParams: { id: ids, limit: ids.length },
    countryCode,
  })
  const byId = new Map(products.map((product) => [product.id, product]))

  return ids
    .map((id) => byId.get(id))
    .filter((product): product is HttpTypes.StoreProduct => Boolean(product))
}

/**
 * A page of a listing: the store, a category, a collection, or the results of
 * a search. The backend's product index finds, filters, sorts and counts the
 * products; the Store API then prices and translates the page.
 */
export const listProductsWithSort = async ({
  page = 1,
  queryParams,
  sortBy,
  countryCode,
  optionValueIds,
  q,
}: {
  page?: number
  queryParams?: ProductListQueryParams
  /** Leave unset to order a text search by relevance. */
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
  q?: string
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const pageNumber = Math.max(page, 1)
  const selectedValueIds = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )
  const region = await getRegion(countryCode)

  if (region && !queryParams?.id) {
    const found = await searchCatalog({
      q,
      categoryIds: queryParams?.category_id as string[] | undefined,
      collectionId: (queryParams?.collection_id as string[] | undefined)?.[0],
      optionValueGroups: await groupOptionValueIds(selectedValueIds),
      sortBy: q ? sortBy : (sortBy ?? "created_at"),
      currencyCode: region.currency_code,
      skip: (pageNumber - 1) * limit,
      take: limit,
    })

    if (found) {
      return {
        response: {
          products: await listProductsInOrder(found.ids, countryCode),
          count: found.count,
        },
        nextPage: found.count > pageNumber * limit ? pageNumber + 1 : null,
        queryParams,
      }
    }
  }

  return listProductsWithSortFromStoreApi({
    page: pageNumber,
    queryParams,
    sortBy: sortBy ?? "created_at",
    countryCode,
    optionValueIds: selectedValueIds,
    q,
  })
}

/**
 * The listing without the product index, for a backend that can't serve one.
 * It sorts and pages the first 100 products in memory, and a text query keeps
 * only those whose text contains it in some locale.
 */
const listProductsWithSortFromStoreApi = async ({
  page,
  queryParams,
  sortBy,
  countryCode,
  optionValueIds,
  q,
}: {
  page: number
  queryParams?: ProductListQueryParams
  sortBy: SortOptions
  countryCode: string
  optionValueIds: string[]
  q?: string
}) => {
  const limit = queryParams?.limit || 12

  if (q) {
    const matchedIds = await matchProductIdsFromStoreApi(q)
    if (!matchedIds.length) {
      return {
        response: { products: [], count: 0 },
        nextPage: null,
        queryParams,
      }
    }
    queryParams = { ...queryParams, id: matchedIds }
  }

  const {
    response: { products },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      ...(optionValueIds.length ? { option_value_id: optionValueIds } : {}),
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)
  const filteredCount = sortedProducts.length
  const offset = (page - 1) * limit
  const paginatedProducts = sortedProducts.slice(offset, offset + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage: filteredCount > offset + limit ? page + 1 : null,
    queryParams,
  }
}

/**
 * The products the search dialog suggests for a query, at most `limit` of
 * them. An empty query suggests the newest products.
 */
export const searchProducts = async (
  query: string,
  limit = 8
): Promise<HttpTypes.StoreProduct[]> => {
  const trimmed = query.trim()
  const countryCode = (await getCountryCode()) ?? DEFAULT_REGION

  if (!trimmed) {
    const {
      response: { products },
    } = await listProducts({ queryParams: { limit }, countryCode })
    return products
  }

  const found = await searchCatalog({ q: trimmed, take: limit })

  if (found) {
    return listProductsInOrder(found.ids, countryCode)
  }

  const matchedIds = await matchProductIdsFromStoreApi(trimmed)

  if (!matchedIds.length) {
    return []
  }

  const {
    response: { products },
  } = await listProducts({
    queryParams: { id: matchedIds, limit },
    countryCode,
  })

  return products
}

/**
 * The search without the product index: a substring match over the first 100
 * products in every locale, so a query finds a product in any language.
 */
const matchProductIdsFromStoreApi = async (query: string): Promise<string[]> => {
  const needle = query.toLowerCase()
  const next = {
    ...(await getCacheOptions("products")),
  }

  const perLocale = await Promise.all(
    locales.map((loc) =>
      sdk.client
        .fetch<{
          products: {
            id: string
            title?: string | null
            description?: string | null
          }[]
        }>("/store/products", {
          method: "GET",
          query: { limit: 100, fields: "id,title,description" },
          headers: { "x-medusa-locale": loc },
          next,
          cache: "force-cache",
        })
        .then((r) => r.products)
        .catch(() => [])
    )
  )

  const matchedIds = new Set<string>()
  for (const products of perLocale) {
    for (const product of products) {
      const haystack =
        `${product.title ?? ""} ${product.description ?? ""}`.toLowerCase()
      if (haystack.includes(needle)) {
        matchedIds.add(product.id)
      }
    }
  }

  return Array.from(matchedIds)
}
