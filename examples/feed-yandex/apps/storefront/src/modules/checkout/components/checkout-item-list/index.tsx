"use client"

import { useState } from "react"
import Image from "next/image"
import type { HttpTypes } from "@medusajs/types"
import { convertToLocale } from "@lib/util/money"
import { updateLineItem } from "@lib/data/cart"
import { useCartUpdate } from "@modules/checkout/context/cart-update-context"
import DeleteButton from "@modules/common/components/delete-button"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { Link } from "@i18n/navigation"
import { Loader } from "@medusajs/icons"
import { useLocale, useTranslations } from "next-intl"

interface CheckoutItemListProps {
  cart: HttpTypes.StoreCart
}

function CheckoutItem({
  item,
  currencyCode,
}: {
  item: HttpTypes.StoreCartLineItem
  currencyCode: string
}) {
  const [updating, setUpdating] = useState(false)
  const locale = useLocale()
  const { trackCartUpdate } = useCartUpdate()

  const imageUrl =
    item.thumbnail || item.variant?.product?.images?.[0]?.url || null

  const total = convertToLocale({
    amount: item.total ?? 0,
    currency_code: currencyCode,
    locale,
  })

  const unitPrice = convertToLocale({
    amount: item.unit_price ?? 0,
    currency_code: currencyCode,
    locale,
  })

  const variantTitle = item.variant?.title
  const maxQty = 10

  const changeQuantity = async (quantity: number) => {
    setUpdating(true)
    await trackCartUpdate(() =>
      updateLineItem({ lineId: item.id, quantity })
    ).finally(() => setUpdating(false))
  }

  return (
    <div className="flex items-center justify-between gap-x-4">
      <div className="flex items-center gap-x-4">
        <Link
          href={`/products/${item.product_handle}`}
          className="flex-shrink-0"
        >
          <div className="w-24 h-24 rounded-[6px] overflow-hidden bg-ui-bg-component shadow-elevation-card-rest flex items-center justify-center">
            {imageUrl ? (
              <Image
                src={imageUrl}
                alt={item.product_title ?? ""}
                width={96}
                height={96}
                className="w-full h-full object-cover object-center"
              />
            ) : (
              <PlaceholderImage size={24} />
            )}
          </div>
        </Link>

        <div className="flex flex-col h-24 py-1 justify-between">
          <span className="txt-medium text-ui-fg-base">
            {item.product_title}
          </span>
          {variantTitle && (
            <span className="txt-medium text-ui-fg-subtle">{variantTitle}</span>
          )}
          <div className="flex items-end h-[22.4px]">
            <DeleteButton id={item.id} data-testid="product-delete-button" />
          </div>
        </div>
      </div>

      <div className="flex flex-col items-end justify-end h-24 py-1 flex-shrink-0 gap-2">
        <span className="txt-medium-plus text-ui-fg-base">
          {item.quantity > 1 ? `${item.quantity} x ${unitPrice}` : total}
        </span>

        <div className="flex items-center justify-center gap-x-4 h-6 px-2 bg-ui-bg-component shadow-elevation-card-rest rounded-[6px]">
          <button
            type="button"
            onClick={() =>
              item.quantity > 1 && changeQuantity(item.quantity - 1)
            }
            disabled={updating || item.quantity <= 1}
            className="txt-compact-xlarge-plus text-ui-fg-subtle disabled:opacity-40 leading-none"
          >
            −
          </button>
          <span className="txt-compact-xsmall-plus text-ui-fg-subtle min-w-[12px] text-center">
            {updating ? (
              <Loader className="w-3 h-3 animate-spin" />
            ) : (
              item.quantity
            )}
          </span>
          <button
            type="button"
            onClick={() =>
              item.quantity < maxQty && changeQuantity(item.quantity + 1)
            }
            disabled={updating || item.quantity >= maxQty}
            className="txt-compact-xlarge-plus text-ui-fg-subtle disabled:opacity-40 leading-none"
          >
            +
          </button>
        </div>
      </div>
    </div>
  )
}

export default function CheckoutItemList({ cart }: CheckoutItemListProps) {
  const t = useTranslations("CheckoutPage")
  const items = cart.items
    ? [...cart.items].sort((a, b) =>
        (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
      )
    : []

  return (
    <div>
      <h2 className="h2-docs mb-3">{t("orderComposition")}</h2>
      <div className="flex flex-col">
        {items.map((item, idx) => (
          <div key={item.id}>
            <CheckoutItem item={item} currencyCode={cart.currency_code} />
            {idx < items.length - 1 && (
              <div className="h-px bg-ui-border-base my-3" />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
