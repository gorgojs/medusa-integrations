"use client"

import type { HttpTypes } from "@medusajs/types"
import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

const ItemsPreviewTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart.items
    ? [...cart.items].sort((a, b) =>
        (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
      )
    : []

  return (
    <div className="flex flex-col gap-y-3" data-testid="items-table">
      {items.map((item) => (
        <Item
          key={item.id}
          item={item}
          type="preview"
          currencyCode={cart.currency_code}
        />
      ))}
    </div>
  )
}

export default ItemsPreviewTemplate
