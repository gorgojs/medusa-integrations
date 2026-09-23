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

export const listProductsWithSort = async ({
  page = 0,
  queryParams,
  sortBy = "created_at",
  countryCode,
  optionValueIds,
}: {
  page?: number
  queryParams?: ProductListQueryParams
  sortBy?: SortOptions
  countryCode: string
  optionValueIds?: OptionValueIds
}): Promise<{
  response: { products: HttpTypes.StoreProduct[]; count: number }
  nextPage: number | null
  queryParams?: ProductListQueryParams
}> => {
  const limit = queryParams?.limit || 12
  const selectedValueIds = Array.from(
    new Set((optionValueIds || []).filter(Boolean))
  )

  const {
    response: { products },
  } = await listProducts({
    pageParam: 0,
    queryParams: {
      ...queryParams,
      ...(selectedValueIds.length
        ? { option_value_id: selectedValueIds }
        : {}),
      limit: 100,
    },
    countryCode,
  })

  const sortedProducts = sortProducts(products, sortBy)
  const filteredCount = sortedProducts.length
  const pageParam = (page - 1) * limit
  const nextPage =
    filteredCount > pageParam + limit ? pageParam + limit : null
  const paginatedProducts = sortedProducts.slice(pageParam, pageParam + limit)

  return {
    response: {
      products: paginatedProducts,
      count: filteredCount,
    },
    nextPage,
    queryParams,
  }
}

export const searchProducts = async (
  query: string
): Promise<HttpTypes.StoreProduct[]> => {
  const trimmed = query.trim()
  const countryCode = (await getCountryCode()) ?? DEFAULT_REGION

  if (!trimmed) {
    const {
      response: { products },
    } = await listProducts({ queryParams: { limit: 8 }, countryCode })
    return products
  }

  const needle = trimmed.toLowerCase()
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

  if (!matchedIds.size) {
    return []
  }

  const {
    response: { products },
  } = await listProducts({
    queryParams: { id: Array.from(matchedIds), limit: 8 },
    countryCode,
  })

  return products
}
