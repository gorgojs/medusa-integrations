"use client"

import { buildPaymentSessionData } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import type { HttpTypes } from "@medusajs/types"
import { useTranslations } from "next-intl"
import { useState } from "react"
import { PaymentButtonShell, type PaymentProviderButtonProps } from "../shared"

const MOLLIE_PROVIDER_ID = "pp_mollie_mollie"

const findSession = (payment_collection?: HttpTypes.StorePaymentCollection | null) =>
  payment_collection?.payment_sessions?.find((s) =>
    s.provider_id.startsWith("pp_mollie_")
  )

/**
 * The address of the payment page of a session started earlier, unless it is
 * missing or Mollie has let the payment expire. A customer who went back from
 * Mollie's page without paying returns to the same page this way, instead of a
 * second payment Mollie would refuse to cancel. A card payment expires after
 * 30 minutes.
 */
const liveCheckoutUrl = (session?: HttpTypes.StorePaymentSession) => {
  const url = session?.data?.checkout_url
  const expiresAt = session?.data?.expires_at

  if (typeof url !== "string" || !url) {
    return null
  }

  if (typeof expiresAt === "string" && Date.parse(expiresAt) <= Date.now()) {
    return null
  }

  return url
}

/**
 * Mollie collects the payment on its own page. This button starts the payment
 * session, which creates the Mollie payment, and sends the customer to its
 * page; the order is placed once they come back through `/api/payment-return`,
 * or by the webhook if that arrives first. A session started before, whose
 * payment is still open, is reused.
 */
const MolliePaymentButton = ({
  cart,
  notReady,
  label,
  cartUpdating,
  "data-testid": dataTestId,
}: PaymentProviderButtonProps) => {
  const t = useTranslations("Errors")
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePayment = async () => {
    setSubmitting(true)
    setErrorMessage(null)

    try {
      const session = findSession(cart.payment_collection)
      let url = liveCheckoutUrl(session)

      if (!url) {
        const providerId = session?.provider_id ?? MOLLIE_PROVIDER_ID
        const { payment_collection } = await initiatePaymentSession(cart, {
          provider_id: providerId,
          data: buildPaymentSessionData(providerId, cart),
        })

        url = liveCheckoutUrl(findSession(payment_collection))
      }

      if (!url) {
        throw new Error(t("paymentFailed"))
      }

      window.location.assign(url)
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : t("paymentFailed"))
      setSubmitting(false)
    }
  }

  return (
    <PaymentButtonShell
      label={label}
      onClick={handlePayment}
      disabled={notReady || cartUpdating}
      loading={submitting}
      errorMessage={errorMessage}
      errorTestId="mollie-payment-error-message"
      data-testid={dataTestId ?? "submit-order-button"}
    />
  )
}

export default MolliePaymentButton
