"use client"

import type { HttpTypes } from "@medusajs/types"
import { useElements, useStripe } from "@stripe/react-stripe-js"
import type { PaymentMethodCreateParams } from "@stripe/stripe-js"
import { useLocale } from "next-intl"
import { useContext } from "react"
import { StripeContext } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import { getPaymentErrorMessage } from "@lib/util/payment-error"
import {
  PaymentButtonShell,
  type PaymentProviderButtonProps,
  usePlaceOrder,
} from "../shared"

// Both statuses mean the money is secured, whether it is captured now or later.
const isPaymentSettled = (status?: string) =>
  status === "requires_capture" || status === "succeeded"

const toBillingDetails = (
  cart: HttpTypes.StoreCart
): PaymentMethodCreateParams.BillingDetails => ({
  name: `${cart.billing_address?.first_name} ${cart.billing_address?.last_name}`,
  address: {
    city: cart.billing_address?.city ?? undefined,
    country: cart.billing_address?.country_code ?? undefined,
    line1: cart.billing_address?.address_1 ?? undefined,
    line2: cart.billing_address?.address_2 ?? undefined,
    postal_code: cart.billing_address?.postal_code ?? undefined,
    state: cart.billing_address?.province ?? undefined,
  },
  email: cart.email,
  phone: cart.billing_address?.phone ?? undefined,
})

const StripeConfirmButton = ({
  cart,
  notReady,
  label,
  cartUpdating,
  "data-testid": dataTestId,
}: PaymentProviderButtonProps) => {
  const locale = useLocale()
  const stripe = useStripe()
  const elements = useElements()
  const {
    submitting,
    setSubmitting,
    errorMessage,
    setErrorMessage,
    completeOrder,
  } = usePlaceOrder()

  const handlePayment = async () => {
    if (!stripe || !elements || !cart) {
      return
    }

    setSubmitting(true)

    await stripe
      .confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/api/payment-return?cart_id=${cart.id}&locale=${locale}`,
          payment_method_data: {
            billing_details: toBillingDetails(cart),
          },
        },
        // Only leave the site when the selected method actually requires it, so
        // card payments still complete inline.
        redirect: "if_required",
      })
      .then(({ error, paymentIntent }) => {
        if (error) {
          if (isPaymentSettled(error.payment_intent?.status)) {
            completeOrder()
            return
          }

          setErrorMessage(getPaymentErrorMessage(error))
          setSubmitting(false)
          return
        }

        if (isPaymentSettled(paymentIntent.status)) {
          completeOrder()
          return
        }

        setSubmitting(false)
      })
      // Stripe.js rejects instead of resolving with an error when it cannot
      // reach Stripe, and the button would otherwise spin forever.
      .catch((error) => {
        setErrorMessage(getPaymentErrorMessage(error))
        setSubmitting(false)
      })
  }

  return (
    <PaymentButtonShell
      label={label}
      onClick={handlePayment}
      disabled={!stripe || !elements || notReady}
      loading={submitting || cartUpdating}
      errorMessage={errorMessage}
      errorTestId="stripe-payment-error-message"
      data-testid={dataTestId}
    />
  )
}

/**
 * The checkout wraps itself in Stripe Elements only once the cart has a Stripe session,
 * and the one-screen checkout shows this button the moment Stripe is selected. Until
 * then it stays disabled instead of calling `useStripe()` outside the Elements provider.
 */
const StripePaymentButton = (props: PaymentProviderButtonProps) => {
  const stripeReady = useContext(StripeContext)

  if (!stripeReady) {
    return (
      <PaymentButtonShell
        label={props.label}
        onClick={() => {}}
        disabled
        loading={props.cartUpdating}
        errorMessage={null}
        errorTestId="stripe-payment-error-message"
        data-testid={props["data-testid"]}
      />
    )
  }

  return <StripeConfirmButton {...props} />
}

export default StripePaymentButton
