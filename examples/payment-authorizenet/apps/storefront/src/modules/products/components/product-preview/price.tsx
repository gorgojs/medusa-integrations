import { Text, clx } from "@medusajs/ui"
import type { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <>
      {price.price_type === "sale" && (
        <Text
          className="line-through decoration-1 text-ui-fg-error"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
      <Text className={clx("text-ui-fg-base")} data-testid="price">
        {price.calculated_price}
      </Text>
    </>
  )
}
