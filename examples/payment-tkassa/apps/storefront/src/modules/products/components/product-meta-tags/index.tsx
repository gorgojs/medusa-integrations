import {
  getPricesForVariant,
  type VariantWithPrice,
} from "@lib/util/get-product-price"
import type { HttpTypes } from "@medusajs/types"

const isAvailable = (variant: HttpTypes.StoreProductVariant) =>
  variant.manage_inventory === false ||
  !!variant.allow_backorder ||
  (variant.inventory_quantity ?? 0) > 0

/**
 * Open Graph product tags, which link previews and shopping crawlers read for
 * the price and the availability. Next's `openGraph` metadata has no product
 * type, so they render here and React hoists them into the head.
 */
export default function ProductMetaTags({
  product,
}: {
  product: HttpTypes.StoreProduct
}) {
  const prices = ((product.variants ?? []) as VariantWithPrice[])
    .map((variant) => getPricesForVariant(variant))
    .filter((price): price is NonNullable<typeof price> => Boolean(price))
  const cheapest = prices.reduce<(typeof prices)[number] | undefined>(
    (min, price) =>
      !min || price.calculated_price_number < min.calculated_price_number
        ? price
        : min,
    undefined
  )
  const amount = cheapest?.calculated_price_number?.toFixed(2)
  const currency = cheapest?.currency_code.toUpperCase()

  return (
    <>
      <meta property="og:type" content="product" />
      {amount && currency && (
        <>
          <meta property="product:price:amount" content={amount} />
          <meta property="product:price:currency" content={currency} />
          <meta property="og:price:amount" content={amount} />
          <meta property="og:price:currency" content={currency} />
        </>
      )}
      <meta
        property="product:availability"
        content={
          (product.variants ?? []).some(isAvailable)
            ? "in stock"
            : "out of stock"
        }
      />
    </>
  )
}
