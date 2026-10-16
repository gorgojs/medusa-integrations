"use client"

import NativeSelect from "@modules/common/components/native-select"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { useTranslations } from "next-intl"
import type { SortOptions } from "@modules/store/components/refinement-list/sort-products"

const SortSelect = ({ sortBy }: { sortBy: SortOptions }) => {
  const t = useTranslations("SortSelect")
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const sortOptions = [
    { value: "created_at", label: t("latestArrivals") },
    { value: "price_asc", label: t("priceLowHigh") },
    { value: "price_desc", label: t("priceHighLow") },
  ]

  const handleChange = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set("sortBy", value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [searchParams, pathname, router]
  )

  return (
    <NativeSelect
      value={sortBy}
      onChange={(e) => handleChange(e.target.value)}
      placeholder={t("placeholder")}
      className="w-[180px]"
    >
      {sortOptions.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </NativeSelect>
  )
}

export default SortSelect
