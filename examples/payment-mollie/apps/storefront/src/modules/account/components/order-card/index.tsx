"use client"

import { Button } from "@medusajs/ui"
import { useMemo } from "react"

import OrderStatusBadge from "@modules/order/components/order-status"
import Thumbnail from "@modules/products/components/thumbnail"
import { Link } from "@i18n/navigation"
import { formatDate } from "@lib/util/date"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import { useLocale, useTranslations } from "next-intl"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

/** How many item thumbnails fit before the card starts counting the rest. */
const PREVIEW_LIMIT = 4

const OrderCard = ({ order }: OrderCardProps) => {
  const t = useTranslations("OrderCard")
  const tc = useTranslations("Common")
  const locale = useLocale()

  const numberOfLines = useMemo(
    () => order.items?.reduce((acc, item) => acc + item.quantity, 0) ?? 0,
    [order]
  )

  const preview = order.items?.slice(0, PREVIEW_LIMIT) ?? []
  const remaining = (order.items?.length ?? 0) - preview.length

  return (
    <div
      className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base p-4 small:p-6"
      data-testid="order-card"
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          className="text-large-semi text-ui-fg-base"
          data-testid="order-display-id"
          data-value={order.display_id}
        >
          {tc("orderNumber", { id: order.display_id ?? order.id })}
        </span>
        <OrderStatusBadge kind="fulfillment" status={order.fulfillment_status} />
        <OrderStatusBadge kind="payment" status={order.payment_status} />
      </div>

      <div className="flex items-center divide-x rtl:divide-x-reverse divide-ui-border-base txt-small text-ui-fg-subtle">
        <span className="pe-2" data-testid="order-created-at">
          {formatDate({ date: order.created_at, locale, dateStyle: "medium" })}
        </span>
        <span className="px-2" data-testid="order-amount">
          {convertToLocale({
            amount: order.total,
            currency_code: order.currency_code,
            locale,
          })}
        </span>
        <span className="ps-2">{t("itemsCount", { count: numberOfLines })}</span>
      </div>

      {/* The thumbnails used to be full-width cards in a four-column grid, so a
          two-item order filled most of the screen. They are a preview, not the
          order. */}
      <div className="flex flex-wrap items-center gap-3">
        {preview.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-x-2"
            data-testid="order-item"
          >
            <div className="w-12 shrink-0">
              <Thumbnail
                thumbnail={item.thumbnail}
                images={[]}
                alt={item.product_title ?? item.title ?? ""}
                size="square"
              />
            </div>
            <span className="txt-small text-ui-fg-subtle">
              <span className="text-ui-fg-base" data-testid="item-title">
                {item.title}
              </span>
              <span className="ms-1" data-testid="item-quantity">
                ×{item.quantity}
              </span>
            </span>
          </div>
        ))}
        {remaining > 0 && (
          <span className="txt-small text-ui-fg-subtle">
            + {remaining} {t("more")}
          </span>
        )}
      </div>

      <div className="flex justify-end">
        <Link href={`/account/orders/details/${order.id}`}>
          <Button data-testid="order-details-link" variant="secondary">
            {t("seeDetails")}
          </Button>
        </Link>
      </div>
    </div>
  )
}

export default OrderCard
