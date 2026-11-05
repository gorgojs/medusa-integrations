"use client"

import Image from "next/image"
import { useState } from "react"
import { updateLineItem } from "@lib/data/cart"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import { useLocale } from "next-intl"
import DeleteButton from "@modules/common/components/delete-button"
import ErrorMessage from "@modules/checkout/components/error-message"
import { Link } from "@i18n/navigation"
import PlaceholderImage from "@modules/common/icons/placeholder-image"
import { Loader } from "@medusajs/icons"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

const Item = ({ item, type = "full", currencyCode }: ItemProps) => {
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const locale = useLocale()

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
    setError(null)
    setUpdating(true)
    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => setError(err.message))
      .finally(() => setUpdating(false))
  }

  if (type === "preview") {
    return (
      <div className="flex items-center gap-x-3" data-testid="product-row">
        <div className="relative flex-shrink-0">
          <Link href={`/products/${item.product_handle}`}>
            <div className="w-[72px] h-[72px] rounded-lg overflow-hidden bg-ui-bg-component border border-ui-border-base flex items-center justify-center">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={item.product_title ?? ""}
                  width={72}
                  height={72}
                  className="w-full h-full object-cover object-center"
                />
              ) : (
                <PlaceholderImage size={20} />
              )}
            </div>
          </Link>
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-ui-fg-base text-ui-bg-base text-[10px] font-medium flex items-center justify-center leading-none">
            {item.quantity}
          </span>
        </div>

        <div className="flex-1 min-w-0 flex flex-col gap-y-0.5">
          <span
            className="txt-compact-medium-plus text-ui-fg-base truncate"
            data-testid="product-title"
          >
            {item.product_title}
          </span>
          {variantTitle && (
            <span className="txt-compact-small text-ui-fg-subtle truncate">
              {variantTitle}
            </span>
          )}
        </div>

        <span className="txt-compact-medium-plus text-ui-fg-base flex-shrink-0">
          {total}
        </span>
      </div>
    )
  }

  return (
    <div
      className="flex items-center justify-between gap-x-4"
      data-testid="product-row"
    >
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

        <div className="flex flex-col justify-between h-24 py-1">
          <span
            className="txt-medium text-ui-fg-base"
            data-testid="product-title"
          >
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
        <span
          className="txt-medium-plus text-ui-fg-base"
          data-testid="product-unit-price"
        >
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
            data-testid="decrease-qty-button"
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
            data-testid="increase-qty-button"
          >
            +
          </button>
        </div>
      </div>

      {error && (
        <ErrorMessage error={error} data-testid="product-error-message" />
      )}
    </div>
  )
}

export default Item
