"use client"

import { isManual, isPaymentSessionReady, isStripeLike } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import type { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useCartUpdate } from "@modules/checkout/context/cart-update-context"
import { useLocale, useTranslations } from "next-intl"
import type React from "react"
import ManualPaymentButton from "./providers/manual"
import StripePaymentButton from "./providers/stripe"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  selectedPaymentMethod?: string
  "data-testid": string
}

/**
 * Picks the button that places the order for the payment provider the customer
 * selected. A new provider takes a file under `providers/`, written against the
 * `PaymentProviderButtonProps` of `shared.tsx`, and a case below.
 */
const PaymentButton: React.FC<PaymentButtonProps> = ({
  cart,
  selectedPaymentMethod,
  "data-testid": dataTestId,
}) => {
  const t = useTranslations("PaymentButton")
  const locale = useLocale()
  const { isCartUpdating } = useCartUpdate()

  const activePaymentMethod =
    selectedPaymentMethod ??
    cart.payment_collection?.payment_sessions?.[0]?.provider_id ??
    ""

  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1 ||
    !activePaymentMethod ||
    !isPaymentSessionReady(activePaymentMethod, cart)

  const providerProps = {
    cart,
    notReady,
    cartUpdating: isCartUpdating,
    label: (
      <>
        {t("placeOrder")}
        <span className="text-ui-fg-disabled">
          {convertToLocale({
            amount: cart.total ?? 0,
            currency_code: cart.currency_code,
            locale,
          })}
        </span>
      </>
    ),
    "data-testid": dataTestId,
  }

  switch (true) {
    case isStripeLike(activePaymentMethod):
      return <StripePaymentButton {...providerProps} />
    case isManual(activePaymentMethod):
      return <ManualPaymentButton {...providerProps} />
    default:
      return (
        <Button disabled size="large" className="w-full">
          {t("selectPaymentMethod")}
        </Button>
      )
  }
}

export default PaymentButton
