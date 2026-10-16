import { Text } from "@medusajs/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import type { HttpTypes } from "@medusajs/types"
import { Link } from "@i18n/navigation"
import { getOptionValueHex, isColorOption } from "@lib/util/color-option"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"
import { getLocale } from "next-intl/server"

export default async function ProductPreview({
  product,
  isFeatured,
  priority,
  fetchPriority,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  priority?: boolean
  fetchPriority?: "high" | "low" | "auto"
  region: HttpTypes.StoreRegion
}) {
  // const pricedProduct = await listProducts({
  //   regionId: region.id,
  //   queryParams: { id: [product.id!] },
  // }).then(({ response }) => response.products[0])

  // if (!pricedProduct) {
  //   return null
  // }

  const locale = await getLocale()
  const { cheapestPrice } = getProductPrice({
    product,
    locale,
  })

  const usedOptionValueIds = new Set(
    product.variants?.flatMap(
      (v) => v.options?.map((o) => o.id).filter(Boolean) ?? []
    ) ?? []
  )

  const textOptions =
    product.options
      ?.filter((o) => !isColorOption(o))
      .flatMap(
        (o) =>
          o.values
            ?.filter((v) => usedOptionValueIds.has(v.id))
            .map((v) => v.value) ?? []
      ) ?? []

  const colorOptions =
    product.options
      ?.filter((o) => isColorOption(o))
      .flatMap((o) => o.values?.filter((v) => usedOptionValueIds.has(v.id)) ?? [])
      .filter((v) => getOptionValueHex(v) !== undefined) ?? []

  return (
    <Link href={`/products/${product.handle}`} className="group">
      <div data-testid="product-wrapper">
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          alt={product.title ?? ""}
          priority={priority}
          fetchPriority={fetchPriority}
          size="full"
          isFeatured={isFeatured}
        />
        <div className="flex flex-col small:flex-row small:items-center small:justify-between txt-compact-medium mt-4 gap-y-1 min-w-0">
          <Text
            className="text-ui-fg-base break-words min-w-0"
            data-testid="product-title"
          >
            {product.title}
          </Text>
          <div className="flex items-center gap-x-2 shrink-0">
            {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
          </div>
        </div>
        <div className="hidden small:flex txt-compact-2xsmall-plus mt-1 justify-between text-ui-tag-neutral-text">
          {textOptions.length > 0 && (
            <div className="flex">
              {textOptions.map((option) => (
                <div key={option} className="first:ps-0 px-2">
                  {option}
                </div>
              ))}
            </div>
          )}
          {colorOptions.length > 0 && (
            <div className="flex items-center gap-x-2">
              {colorOptions.map((color) => (
                <span
                  key={color.id}
                  title={color.value}
                  className="size-3 rounded-full inline-block border border-ui-border-base"
                  style={{ backgroundColor: getOptionValueHex(color) }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}
