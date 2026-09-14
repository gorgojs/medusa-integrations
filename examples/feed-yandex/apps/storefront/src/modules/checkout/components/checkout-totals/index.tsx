"use client"

import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import { useCartUpdate } from "@modules/checkout/context/cart-update-context"
import { useLocale, useTranslations } from "next-intl"

const CheckoutTotals = ({ cart }: { cart: HttpTypes.StoreCart }) => {
  const t = useTranslations("CheckoutPage")
  const locale = useLocale()
  const { isCartUpdating } = useCartUpdate()

  const { currency_code, total, item_subtotal, shipping_subtotal } = cart
  // The Store API calculates and returns `discount_subtotal`, but `StoreCart`
  // in @medusajs/types 2.19.0 declares only `discount_total`, which folds in
  // the tax portion of the discount. Read the field the API actually sends.
  const { discount_subtotal } = cart as typeof cart & {
    discount_subtotal?: number
  }
  const itemCount = cart.items?.length ?? 0

  return (
    <div className="flex flex-col gap-y-3">
      <div className="flex flex-col txt-medium text-ui-fg-subtle">
        <div className="flex items-center justify-between">
          <span>{t("itemsCount", { count: itemCount })}</span>
          <span data-testid="cart-subtotal">
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code, locale })}
          </span>
        </div>

        <div className="flex items-center justify-between">
          <span>{t("shippingCost")}</span>
          <span data-testid="cart-shipping">
            {convertToLocale({ amount: shipping_subtotal ?? 0, currency_code, locale })}
          </span>
        </div>

        {!!discount_subtotal && (
          <div className="flex items-center justify-between">
            <span>{t("discount")}</span>
            <span
              className="text-ui-fg-interactive"
              data-testid="cart-discount"
            >
              - {convertToLocale({ amount: discount_subtotal, currency_code, locale })}
            </span>
          </div>
        )}
      </div>

      <div className="h-px bg-ui-border-base" />

      <div className="flex items-center justify-between">
        <h2 className="h2-docs">{t("total")}</h2>
        {isCartUpdating ? (
          <span
            className="inline-block w-28 h-7 rounded-xl bg-ui-border-base animate-pulse"
            data-testid="cart-total-skeleton"
          />
        ) : (
          <span
            className="txt-xlarge-plus text-ui-fg-base"
            data-testid="cart-total"
          >
            {convertToLocale({ amount: total ?? 0, currency_code, locale })}
          </span>
        )}
      </div>
    </div>
  )
}

export default CheckoutTotals
