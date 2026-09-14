"use client"

import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { PaymentButtonShell, type PaymentProviderButtonProps } from "../shared"

const paymentUrl = (cart: HttpTypes.StoreCart) => {
  const session = cart.payment_collection?.payment_sessions?.find((s) =>
    s.provider_id.startsWith("pp_tkassa")
  )

  return (session?.data as { PaymentURL?: string } | undefined)?.PaymentURL
}

/**
 * T-Kassa collects the payment on its own page. The session the checkout
 * created carries the address to send the customer to, and the order is placed
 * once they come back through `/api/payment-return` — or by the webhook, if
 * that arrives first.
 */
const TkassaPaymentButton = ({
  cart,
  notReady,
  label,
  cartUpdating,
  "data-testid": dataTestId,
}: PaymentProviderButtonProps) => {
  const t = useTranslations("Errors")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePayment = () => {
    const url = paymentUrl(cart)

    if (!url) {
      setErrorMessage(t("paymentFailed"))
      return
    }

    setSubmitting(true)
    window.location.assign(url)
  }

  return (
    <PaymentButtonShell
      label={label}
      onClick={handlePayment}
      disabled={notReady}
      loading={submitting || cartUpdating}
      errorMessage={errorMessage}
      errorTestId="tkassa-payment-error-message"
      data-testid={dataTestId ?? "submit-order-button"}
    />
  )
}

export default TkassaPaymentButton
