import type { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import Thumbnail from "@modules/products/components/thumbnail"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem | HttpTypes.StoreOrderLineItem
  currencyCode: string
}

/**
 * One line of the order. It used to be a table row, which came with a hover
 * highlight and a trailing border that promised a link the row never had, plus
 * cell padding that pushed it out of line with every other section on the page.
 */
const Item = ({ item, currencyCode }: ItemProps) => {
  return (
    <li
      className="flex items-center gap-x-4 py-4 first:pt-0 last:pb-0"
      data-testid="product-row"
    >
      <div className="w-16 shrink-0">
        <Thumbnail
          thumbnail={item.thumbnail}
          alt={item.product_title ?? item.title ?? ""}
          size="square"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <Text
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-name"
        >
          {item.product_title}
        </Text>
        <LineItemOptions variant={item.variant} data-testid="product-variant" />
      </div>

      <div className="flex shrink-0 flex-col items-end">
        <span className="flex gap-x-1">
          <Text className="text-ui-fg-muted">
            <span data-testid="product-quantity">{item.quantity}</span>x{" "}
          </Text>
          <LineItemUnitPrice
            item={item}
            style="tight"
            currencyCode={currencyCode}
          />
        </span>

        <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
      </div>
    </li>
  )
}

export default Item
