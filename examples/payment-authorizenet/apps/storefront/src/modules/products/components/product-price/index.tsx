"use client"

import { clx } from "@medusajs/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import type { HttpTypes } from "@medusajs/types"
import { useLocale, useTranslations } from "next-intl"

export default function ProductPrice({
  product,
  variant,
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
}) {
  const locale = useLocale()
  const t = useTranslations("ProductPrice")
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
    locale,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse" />
  }

  return (
    <div className="flex flex-col">
      <span
        className={clx("h4-webs text-ui-fg-base", {
          "text-ui-fg-base": selectedPrice.price_type !== "sale",
        })}
      >
        {!variant && t("from")}
        <span
          data-testid="product-price"
          data-value={selectedPrice.calculated_price_number}
        >
          {selectedPrice.calculated_price}
        </span>
      </span>
      {selectedPrice.price_type === "sale" && (
        <div className="flex items-center gap-x-2 mt-1">
          <span
            className="text-sm line-through text-ui-fg-muted"
            data-testid="original-product-price"
            data-value={selectedPrice.original_price_number}
          >
            {selectedPrice.original_price}
          </span>
          <span className="text-sm text-ui-fg-base">
            -{selectedPrice.percentage_diff}%
          </span>
        </div>
      )}
    </div>
  )
}
