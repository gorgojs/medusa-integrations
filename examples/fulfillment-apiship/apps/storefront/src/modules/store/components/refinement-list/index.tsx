"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useMemo } from "react"

import {
  OPTION_VALUE_QUERY_KEY,
  parseOptionValueIds,
} from "@lib/util/product-option-filters"
import type { ProductOptionFilterGroup } from "@lib/data/products"
import OptionsPicker from "./options-picker"
import SortProducts, { type SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  search?: boolean
  hideOptionsPicker?: boolean
  display?: "all" | "filters" | "sort"
  optionFilters?: ProductOptionFilterGroup[]
  "data-testid"?: string
}

const RefinementList = ({
  sortBy,
  hideOptionsPicker = false,
  display = "all",
  optionFilters,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const updateQueryParams = useCallback(
    (updater: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(searchParams.toString())
      updater(params)

      params.delete("page")

      const queryString = params.toString()
      const currentQuery = searchParams.toString()
      const nextPath = queryString ? `${pathname}?${queryString}` : pathname
      const currentPath = currentQuery
        ? `${pathname}?${currentQuery}`
        : pathname

      if (nextPath !== currentPath) {
        router.push(nextPath)
      }
    },
    [pathname, router, searchParams]
  )

  const setQueryParams = (name: string, value: string) =>
    updateQueryParams((params) => params.set(name, value))

  const selectedOptionValueIds = useMemo(
    () => parseOptionValueIds(searchParams),
    [searchParams]
  )

  const setOptionValueIds = (valueIds: string[]) =>
    updateQueryParams((params) => {
      params.delete(OPTION_VALUE_QUERY_KEY)
      valueIds.forEach((valueId) =>
        params.append(OPTION_VALUE_QUERY_KEY, valueId)
      )
    })

  const showFilters = display === "all" || display === "filters"
  const showSort = display === "all" || display === "sort"

  return (
    <div className="flex flex-wrap items-center gap-2">
      {showFilters && !hideOptionsPicker && !!optionFilters?.length && (
        <OptionsPicker
          options={optionFilters}
          selectedValueIds={selectedOptionValueIds}
          setOptionValueIds={setOptionValueIds}
        />
      )}
      {showSort && (
        <SortProducts
          sortBy={sortBy}
          setQueryParams={setQueryParams}
          data-testid={dataTestId}
        />
      )}
    </div>
  )
}

export default RefinementList
