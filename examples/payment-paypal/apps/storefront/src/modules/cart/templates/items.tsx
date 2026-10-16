import repeat from "@lib/util/repeat"
import type { HttpTypes } from "@medusajs/types"
import { getTranslations } from "next-intl/server"

import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const CartItemSkeleton = () => (
  <div className="flex gap-x-4 py-4 border-b border-ui-border-base animate-pulse">
    <div className="w-20 h-20 rounded-lg bg-ui-bg-component flex-shrink-0" />
    <div className="flex flex-col gap-y-2 flex-1">
      <div className="w-32 h-4 bg-ui-bg-component rounded" />
      <div className="w-24 h-3 bg-ui-bg-component rounded" />
      <div className="w-20 h-3 bg-ui-bg-component rounded" />
    </div>
    <div className="w-16 h-4 bg-ui-bg-component rounded" />
  </div>
)

const ItemsTemplate = async ({ cart }: ItemsTemplateProps) => {
  const t = await getTranslations("Cart")
  const items = cart?.items

  return (
    <div>
      <h1 className="text-[2rem] leading-[2.25rem] font-medium mb-8">
        {t("heading")}
      </h1>

      <div data-testid="items-table">
        {items
          ? items
              .sort((a, b) =>
                (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
              )
              .map((item, idx) => (
                <div key={item.id}>
                  <Item
                    key={item.id}
                    item={item}
                    currencyCode={cart?.currency_code ?? ""}
                  />
                  {idx < items.length - 1 && (
                    <div className="h-px bg-ui-border-base my-3" />
                  )}
                </div>
              ))
          : repeat(5).map((i) => <CartItemSkeleton key={i} />)}
      </div>
    </div>
  )
}

export default ItemsTemplate
