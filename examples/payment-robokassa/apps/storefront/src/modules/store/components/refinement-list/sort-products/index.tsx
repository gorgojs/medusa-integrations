"use client"

import { Select } from "@medusajs/ui"
import { useTranslations } from "next-intl"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const t = useTranslations("SortSelect")

  const sortOptions = [
    { value: "created_at", label: t("latestArrivals") },
    { value: "price_asc", label: t("priceLowHigh") },
    { value: "price_desc", label: t("priceHighLow") },
  ]

  return (
    <Select
      value={sortBy}
      onValueChange={(value) => setQueryParams("sortBy", value)}
      data-testid={dataTestId}
    >
      <Select.Trigger
        aria-label={t("placeholder")}
        className="w-[180px] bg-ui-bg-base"
      >
        <Select.Value placeholder={t("placeholder")} />
      </Select.Trigger>
      <Select.Content className="bg-ui-bg-base">
        {sortOptions.map((option) => (
          <Select.Item className="bg-ui-bg-base flex flex row" key={option.value} value={option.value}>
            {option.label}
          </Select.Item>
        ))}
      </Select.Content>
    </Select>
  )
}

export default SortProducts
